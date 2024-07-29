const express = require('express'); 
const mysql = require('mysql2'); 
const multer = require('multer');
const app = express(); 

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images'); //directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); 
  }
});
const upload = multer({ storage: storage });
// Create MySQL connection 
const connection = mysql.createConnection({ 
    host: 'localhost', 
    user: 'azure', 
    password: '3TAhRx9Sq2*gFmt', 
    database: 'freedb_c237db2302' 
});
 
connection.connect((err) => { 
  if (err) { 
    console.error('Error connecting to MySQL:', err); 
    return; 
  } 
  console.log('Connected to MySQL database'); 
});
 
// Set up view engine 
app.set('view engine', 'ejs'); 

// enable static files 
app.use(express.static('public')); 

// enable form processing
app.use(express.urlencoded({
  extended: false
}));
// Define routes 
app.get('/', (req, res) => { 
  connection.query('SELECT * FROM stores', (error, results) => { 
    if (error) throw error; 
    res.render('index', { stores: results }); // Render HTML page with data 
  }); 
}); 
//Add new store
app.get('/addStore', (req, res) => {
  res.render('addStore');
});
//Create Routes to retrieve ONE store by id
app.get('/store/:id', (req, res) => {
  //extract the store ID from the request params
  const storeID = req.params.id;
  const sql = 'SELECT * FROM stores WHERE storeID = ?';
  //Fetch data from MySQL based on the store ID
  connection.query( sql , [storeID], (error, results) => {
    if(error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error Retrieving store by ID');
    }
    //check if any store with the given ID was found
    if (results.length > 0) {
      const reviewUrl = `/giveReview?storeID=${storeID}`;
      res.render('store', { store: results[0], reviewUrl: reviewUrl });
    } else {
      //if no store with the given ID was found, render a 404 page or handle it accordingly
      res.status(404).send('Store not found');
    }
  });
});
app.get('/editStore/:id', (req, res) => {
  const storeID = req.params.id;
  const sql = 'SELECT * FROM stores WHERE storeID = ?';
  //fetch data from MySql based on store ID
  connection.query( sql , [storeID], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error Retrieving store by ID');
    }
    //check is any store with the given ID was found
    if (results.length > 0) {
      res.render('editStore', { store: results[0] });
    } else {
      //if no store with the given ID was found, render a 404 page or handle it accordingly
      res.status(404).send('Store not found');
    }
  });
});
app.get('/deleteStore/:id', (req, res) => {
  const storeID = req.params.id;
  // Delete reviews in association with the storeID
  const deleteReviewsSql = 'DELETE FROM reviews WHERE storeID = ?';
  connection.query(deleteReviewsSql, [storeID], (error, results) => {
    if (error) {
      console.error('Error deleting reviews for store:', error);
      return res.status(500).send('Error deleting reviews for store');
    }
    // Delete the store after  deleting its reviews
    const deleteStoreSql = 'DELETE FROM stores WHERE storeID = ?';
    connection.query(deleteStoreSql, [storeID], (error, results) => {
      if (error) {
        console.error('Error deleting store:', error);
        return res.status(500).send('Error deleting store');
      } else {
        res.redirect('/');
      }
    });
  });
});
app.post('/addStore', upload.single('image'), (req, res) => {
  //extract store data from the req body
  const { name, location, description } = req.body;
  let image;
  if (req.file) {
    image = req.file.filename; //save only filename
  } else {
    image = 'noImage.png'; //default image if no file is uploaded
  }
  const sql = 'INSERT INTO stores (storeName, location, description, image) VALUES (?, ?, ?, ?)';
  // insert the new store into the database
  connection.query(sql, [name, location, description, image], (error, results) => {
    if (error) {
      //handle any err that occured during the database operation
      console.error('Error adding store:', error);
      return res.status(500).send('Error adding store');
    } else {
      //send a success response
      res.redirect('/');
    };
  });
});
app.post('/editStore/:id', upload.single('image'), (req, res) => {
  const storeID = req.params.id;
  //extract store data from the req body
  const { name, location, description } = req.body;
  let image = req.body.currentImage; //retrieve current img filename
  if (req.file) { // if new img is uploaded
    image = req.file.filename; //set img to be the new img filename
  }
  const sql = 'UPDATE stores SET storeName = ?, location = ?, description = ?, image =? WHERE storeID = ?';
  //insert the new store into the database
  connection.query( sql , [name, location, description, image, storeID], (error, results) => {
    if (error) {
      //  handle any error that occurs during the database operation
      console.error('Error updating store:', error);
      return res.status(500).send('Error updating store');
    } else {
      //send a success response
      res.redirect('/');
    }
  });
});


//CRUD FOR REVIEWS
//make review page


app.get('/giveReview', (req, res) => {
  const storeID = req.query.storeID;
  if (!storeID) {
    return res.status(400).send('Store ID is required');
  }
  res.render('giveReview', { storeID: storeID });
});
app.get('/reviews', (req, res) => { 
  const query = `
    SELECT reviews.reviewID, reviews.title, reviews.rating, reviews.review, stores.storeName 
    FROM reviews 
    JOIN stores ON reviews.storeID = stores.storeID`;

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching reviews with store names:', error);
      return res.status(500).send('Error fetching reviews');
    }
    // Pass the results directly to the template
    res.render('reviews', { reviews: results });
  });
}); 
app.get('/editReview/:id', (req, res) => {
  const reviewID = req.params.id;
  // Updated SQL query to join the 'reviews' table with the 'store' table
  const sql = `
    SELECT reviews.*, stores.storeName 
    FROM reviews 
    JOIN stores ON reviews.storeID = stores.storeID 
    WHERE reviews.reviewID = ?`;

  connection.query(sql, [reviewID], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error Retrieving review by ID');
    }
    if (results.length > 0) {
      // Pass the first result to the template, which includes the storeName
      res.render('editReview', { review: results[0] });
    } else {
      res.status(404).send('Review not found');
    }
  });
});
app.post('/giveReview',(req, res) => {
  //extract store data from the req body
  const {title, rating, review, storeID} = req.body;
  const sql = 'INSERT INTO reviews (title, rating, review, storeID) VALUES (?, ?, ?, ?)';
  // insert the new store into the database
  connection.query(sql, [title, rating, review, storeID], (error, results) => {
    if (error) {
      //handle any err that occured during the database operation
      console.error('Error giving review:', error);
      return res.status(500).send('Error giving review');
    } else {
      //send a success response
      res.redirect('/');
    };
  });
});
app.post('/editReview/:id', (req, res) => {
  const reviewID = req.params.id;
  //extract store data from the req body
  const {title, rating, review } = req.body;
  const sql = 'UPDATE reviews SET title = ?, rating = ?, review =? WHERE reviewID = ?';
  //insert the new store into the database
  connection.query( sql , [title, rating, review, reviewID], (error, results) => {
    if (error) {
      //  handle any error that occurs during the database operation
      console.error('Error updating review:', error);
      return res.status(500).send('Error updating review');
    } else {
      //send a success response
      res.redirect('/');
    }
  });
});
app.get('/deleteReview/:id', (req, res) => {
  const reviewID = req.params.id;
  const sql = 'DELETE FROM reviews WHERE reviewID = ?';
  connection.query( sql , [reviewID], (error, results) => {
    if (error) {
      //handle any error that occurs during the database operation
      console.error('Error deleting review:', error);
      return res.status(500).send('Error deleting review');
    } else {
      //send a success response
    res.redirect('/reviews');
    }
  });
});
app.get('/store/:id/reviews', (req, res) => {
  const storeID = req.params.id;
  // Directly use storeID to fetch reviews, assuming a 'storeID' column exists in the 'reviews' table
  connection.query('SELECT * FROM reviews WHERE storeID = ?', [storeID], (reviewError, reviewResults) => {
    if (reviewError) {
      console.error('Error fetching reviews:', reviewError);
      return res.status(500).send('Error fetching reviews');
    }
    if (reviewResults.length > 0) {
      // Fetch the store name separately if needed for rendering
      connection.query('SELECT storeName FROM stores WHERE storeID = ?', [storeID], (error, storeResults) => {
        if (error) {
          console.error('Error fetching store name:', error);
          return res.status(500).send('Error fetching store name');
        }
        const storeName = storeResults.length > 0 ? storeResults[0].storeName : 'Unknown Store';
        res.render('storeReviews', { reviews: reviewResults, storeName: storeName });
      });
    } else {
      res.status(404).send('No reviews found for this store');
    }
  });
});
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`)); 
//See yuheng 23023660
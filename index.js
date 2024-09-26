import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const app = express();
const port = 3000;
const API_INFO_URL = "https://openlibrary.org/";
const API_COVER_URL = "https://covers.openlibrary.org/"

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "bookrev",
  password: "Nahl100597",
  port: 5432,
});
db.connect();

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let books = [
  { id: 1, olid: "", title: "The Psychology Of Money", coverurl: "", author: "Morgan Housel", daterelease: "2015-05-15", review: "xxx", rating: 9 },
  { id: 2, olid: "", title: "Rich Dad Poor Dad", coverurl: "", author: "Robert Kyosaki", daterelease: "2017-06-16", review: "yyy", rating: 9 }
];


// Route to render the main page
app.get("/", async (req, res) => {
  var result;
  if (req.query.sort == "title") {
    result = await db.query("SELECT * FROM books ORDER BY title;");
  } else if (req.query.sort == "date") {
    result = await db.query("SELECT * FROM books ORDER BY daterelease;");
  } else {
    result = await db.query("SELECT * FROM books ORDER BY id;");
  }
  books = result.rows;
  try {
    res.render("index.ejs", { books: books });
  } catch (error) {
    res.status(500).json({ message: "Books does not exist" });
  }
});

// Route to render the edit page
app.get("/new", (req, res) => {
  res.render("modify.ejs", { heading: "New Post", submit: "Create Review" });
});

app.get("/edit/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const result = await db.query("SELECT * FROM books WHERE id = $1;", [bookId]);
    const book = result.rows[0];
    res.render("modify.ejs", {
      heading: "Edit Post",
      submit: "Update Post",
      book: book,
    });
  } catch (error) {
    res.status(500).json({ message: "Book does not exist" });
  }
});

// Create a new post
app.post("/posts", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books;");
    books = result.rows;
    // get olid
    const response = await axios.get(API_INFO_URL + "search.json", {
      params: {
        title: req.body.title
      }
    });
    const bookData = response.data.docs[1];
    const newBook_olid = bookData.cover_edition_key;
    // get coverurl
    const coverUrl = API_COVER_URL + "b/olid/" + newBook_olid + "-M.jpg";
    // insert newbook
    await db.query("INSERT INTO books (id, olid, title, coverurl, author, daterelease, review, rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8);", [books.length+1, newBook_olid, req.body.title, coverUrl, req.body.author, req.body.daterelease, req.body.review, req.body.rating]);
    res.redirect("/");
  } catch (error) {
    res.status(500).json({ message: "Book Cover Not Found" });
  }
});

// Partially update a post
app.post("/posts/:id", async (req, res) => {
  const bookId = req.params.id;
  const result = await db.query("SELECT * FROM books WHERE id = $1;", [bookId]);
  const book = result.rows[0];
  const updatedBook = {
    id: book.id,
    olid: book.olid,
    title: req.body.title,
    coverurl: book.coverurl,
    author: req.body.author,
    daterelease: req.body.daterelease,
    review: req.body.review,
    rating: req.body.rating
  };
  try {
    if (updatedBook.title != book.title) {
      // get olid
      const response = await axios.get(API_INFO_URL + "search.json", {
        params: {
          title: updatedBook.title
        }
      });
      const bookData = response.data.docs[1];
      updatedBook.olid = bookData.cover_edition_key;
      // get coverurl
      const coverUrl = API_COVER_URL + "b/olid/" + updatedBook.olid + "-M.jpg";
      updatedBook.coverurl = coverUrl;
    }
    await db.query("UPDATE books SET id = $1, olid = $2, title = $3, coverurl = $4, author = $5, daterelease = $6, review = $7, rating = $8 WHERE id = $1;", [updatedBook.olid, updatedBook.title, updatedBook.coverurl, updatedBook.author, updatedBook.daterelease, updatedBook.review, updatedBook.rating]);
    res.redirect("/");
  } catch (error) {
    res.status(500).json({ message: "Error updating post" });
  }
});

// Delete a post
app.get("/posts/delete/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    await db.query("DELETE FROM books WHERE id = $1;", [bookId]);
    res.redirect("/");
  } catch (error) {
    res.status(500).json({ message: "Error deleting post" });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});

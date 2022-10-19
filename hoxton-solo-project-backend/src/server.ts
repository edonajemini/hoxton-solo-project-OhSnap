import { PrismaClient } from "@prisma/client";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "dotenv";

env.config();
const JWT_SECRET = process.env.JWT_SECRET!;

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const port = 4000;

function generateToken(id: number) {
  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: "1h" });
  return token;
}

function verifyToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET);
  // @ts-ignore
  return decoded.id;
}

async function getCurrentUser(token: string) {
  const decoded = verifyToken(token);

  const userPremium = await prisma.userPremium.findUnique({
    where: { id: decoded },
  });

  return userPremium;
}

//SignIn user
app.post("/sign-up", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await prisma.userPremium.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    } else {
      const hashedPassword = bcrypt.hashSync(password);

      const userPremium = await prisma.userPremium.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
      });

      const token = generateToken(userPremium.id);

      res.send({ userPremium, token });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//log-in user
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userPremium = await prisma.userPremium.findUnique({
      where: { email },
    });

    if (!userPremium) {
      return res.status(400).send({ error: "Invalid credentials." });
    }

    const valid = bcrypt.compareSync(password, userPremium.password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const token = generateToken(userPremium.id);

    res.send({ userPremium, token });
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//Get/validate the current user
app.get("/validate", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(400).send({ error: "You are not signed in!" });
    } else {
      const userPremium = await getCurrentUser(token);
      if (userPremium) {
        res.send({ userPremium, token: generateToken(userPremium.id) });
      } else {
        res.status(400).send({ error: "Please try to sign in again!" });
      }
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//Get all BLOGS searched by tittle
app.get("/blogs/blog/:title", async (req, res) => {
  try {
    const { title } = req.params;

    const blogs = await prisma.blog.findMany({
      where: { title: { contains: title } },
      include: { reviews: true, userPremium: true },
    });

    res.send(blogs);
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});
//Get all BLOGS filtered by category
app.get("/blogs/:category", async (req, res) => {
  try {
    const { category } = req.params;

    const blogs = await prisma.blog.findMany({
      where: { category: category },
      include: { reviews: true },
    });

    res.send(blogs);
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});
//saved blogs
app.get("/savedBlogs", async (req, res) => {
  const blogs = await prisma.blog.findMany({
    where: {
      saved: true,
    },
    include: { reviews: true, userPremium: true },
  });
  res.send(blogs);
})

//Get all blogs
app.get("/blogs", async (req, res) => {
  try {
    const blogs = await prisma.blog.findMany({
      include: { reviews: true },
    });

    res.send(blogs);
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//Get blog by id
app.get("/blog-detail/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await prisma.blog.findUnique({
      where: { id: Number(id) },
      include: { reviews: true },
    });

    res.send(blog);
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//Get users by id
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { reviews: true},
    });
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ error: "User not found!" });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});


//Get userpremiums by id
app.get("/usersPremium/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const userPremium = await prisma.userPremium.findUnique({
      where: { id: Number(id) },
      include: { reviews: true, blog: true },
    });
    if (userPremium) {
      res.send(userPremium);
    } else {
      res.status(404).send({ error: "UserPremium not found!" });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});
//Get userpremiums by name
app.get("/userPremium/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const userPremium = await prisma.userPremium.findUnique({
      where: { name: name },
      include: { reviews: true, blog: true },
    });
    if (userPremium) {
      res.send(userPremium);
    } else {
      res.status(404).send({ error: "UserPremium not found!" });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//Get all reviews for a blog
app.get("/blogs/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.review.findMany({
      where: { blogId: Number(id) },
      include: { userPremium: true, user: true },
    });

    res.send(reviews);
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//Get all reviews for the current user
app.get("/user/reviews", async (req, res) => {
  try {
    // @ts-ignore
    const user = await getCurrentUser(req.headers.authorization);
    if (user) {
      const reviews = await prisma.review.findMany({
        where: { userId: user.id },
        include: { userPremium: true, user: true },
      });

      res.send(reviews);
    } else {
      res
        .status(401)
        .send({ error: "You need to be signed in to unlock this feature!" });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});
//Get all reviews for the current userPremium
app.get("/userPremium/reviews", async (req, res) => {
  try {
    // @ts-ignore
    const userPremium = await getCurrentUser(req.headers.authorization);
    if (userPremium) {
      const reviews = await prisma.review.findMany({
        where: { userPremiumId: userPremium.id },
        include: { user: true, userPremium: true },
      });

      res.send(reviews);
    } else {
      res
        .status(401)
        .send({ error: "You need to be signed in to unlock this feature!" });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

// This endpoint will post a new blog 
app.post("/blogs", async (req, res) => {
  try {
    const { title,intro,blog, image,video, userPremiumId,category ,saved,liked} =
      req.body;

    let errors: string[] = [];

    if (typeof title !== "string") {
      errors.push("Add a proper Title!");
    }
  
    if (typeof blog !== "string") {
      errors.push("Add a proper Text");
    }
    if (typeof userPremiumId !== "number") {
      errors.push("Add a proper user ID");
    }
    if (errors.length === 0) {
      const newBlog = await prisma.blog.create({
        data: {
          title: blog.title,
          intro: blog.intro,
          blog:blog.blog,
          image:blog.image,
          video:blog.video,
          category:blog.category,
          saved:false,
          liked:false,
          userPremium: {
            connect: {
              id: Number(req.body.userPremiumId),
            },
          },
        },
        include: { reviews: true, userPremium:true }
      });

      res.send(newBlog);
    } else {
      res.status(400).send({ errors: errors });
    }
  } catch (error) {
    // @ts-ignore
    res.status(500).send({ error: error.message });
  }
});

//get all users
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.send(users);
});
//get all premium users
app.get("/premiumusers", async (req, res) => {
  const userPremium = await prisma.userPremium.findMany();
  res.send(userPremium);
});

//delete blog
app.delete("/blogs/:id", async (req, res) => {
  try {
    const blog = await prisma.blog.delete({
      where: { id: Number(req.params.id) },
    });
    res.send(blog);
  } catch (error) {
    res.status(400).send({ error: error });
  }
});

//post reviews
app.post("/reviews", async (req, res) => {
  const reviews = {
    content: req.body.content,
    userPremiumId: req.body.userPremiumId,
    rating: req.body.rating,
    blogId: req.body.blogId
  };
  let errors: string[] = [];

  if (typeof req.body.content !== "string") {
    errors.push("Add a proper content!");
  }
  if (typeof req.body.userPremiumId !== "number") {
    errors.push("Add a proper user Id!");
  }
  if (typeof req.body.userId !== "number") {
    errors.push("Add a proper user Id");
  }
  if (errors.length === 0) {
    try {
      const newReview = await prisma.review.create({
        data: {
          content: reviews.content,
          userPremiumId: reviews.userPremiumId,
          blogId: reviews.blogId
        },
      });
      res.send(newReview);
    } catch (err) {
      // @ts-ignore
      res.status(400).send(err.message);
    }
  } else {
    res.status(400).send({ errors: errors });
  }
});
//delete reviews
app.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await prisma.review.delete({
      where: { id: Number(req.params.id) },
    });
    res.send(review);
  } catch (error) {
    res.status(400).send({ error: error });
  }
});

app.listen(port, () => {
  console.log(`Listening to http://localhost:${port}`);
});

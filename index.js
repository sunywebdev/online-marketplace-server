const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

var admin = require("firebase-admin");

var serviceAccount = "./online-marketplace-2022-firebase-adminsdk.json";

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

//To select ID from MongoDB
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

//MongoDB linking
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@online-marketplace.dfqhd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

//Verify with user token
async function verifyToken(req, res, next) {
	if (req.headers?.authorization?.startsWith("Bearer ")) {
		const token = req.headers.authorization.split(" ")[1];
		try {
			const decodedUser = await admin.auth().verifyIdToken(token);
			req.decodedEmail = decodedUser?.email;
		} catch {}
	}
	next();
}

async function run() {
	try {
		await client.connect();

		//DB Folder and Subfolder
		const database = client.db("collegeManagement");
		const gigsCollection = database.collection("gigs");
		const usersCollection = database.collection("users");
		const ordersCollection = database.collection("orders");

		/* ------
        ------ login , role, add user
        ------ */

		//To add new user when login or signup
		app.post("/users", async (req, res) => {
			const newuser = req.body;
			console.log("Request from UI ", newuser);
			const result = await usersCollection.insertOne(newuser);
			console.log("Successfully Added New User ", result);
			res.json(result);
		});
		//To update or replace users data when login or signup
		app.put("/users", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					email: user?.email,
					displayName: user?.displayName,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});

		//Check Admin or Not
		app.get("/users/:email", async (req, res) => {
			const email = req.params.email;
			console.log("from UI", email);
			const filter = { email: email };
			console.log("Request to find ", filter);
			const user = await usersCollection.findOne(filter);
			console.log(user);
			let isAdmin = false;
			if (user?.userRole === "Admin") {
				isAdmin = true;
			}
			res.json({ admin: isAdmin });
			console.log("Found one", user);
		});

		/* ------
        ------add all
        ------ */
		//To update or replace users data
		app.put("/users/updateUsers", async (req, res) => {
			console.log(req.body);
			const user = req.body;
			const filter = { email: user?.email };
			console.log("Request to replace or add user", user);
			const options = { upsert: true };
			const updateuser = {
				$set: {
					userName: user?.userName,
					contact: user?.contact,
					address: user?.address,
					photoURL: user?.photoURL,
				},
			};
			const result = await usersCollection.updateOne(
				filter,
				updateuser,
				options,
			);
			res.json(result);
			console.log("Successfully replaced or added user", result);
		});
		//To add new orders
		app.post("/orders", async (req, res) => {
			const newOrder = req.body;
			console.log("Request from UI ", newOrder);
			const result = await ordersCollection.insertOne(newOrder);
			console.log("Successfully Added New order ", result);
			res.json(result);
		});
		//To add new gig
		app.post("/gigs", async (req, res) => {
			const newGig = req.body;
			console.log("Request from UI ", newGig);
			const result = await gigsCollection.insertOne(newGig);
			console.log("Successfully Added New gig ", result);
			res.json(result);
		});
		//To update or replace users role
		app.put("/users/pageRole", verifyToken, async (req, res) => {
			const user = req.body;
			console.log("Decoded email", req.decodedEmail);
			const requester = req.decodedEmail;
			if (requester) {
				const requesterAccount = await usersCollection.findOne({
					email: requester,
				});
				if (requesterAccount.userRole === "Admin") {
					const filter = { email: user?.email };
					console.log("Request to replace or add Role", user);
					const options = { upsert: true };
					const updateuser = {
						$set: {
							userRole: user?.userRole,
						},
					};
					const result = await usersCollection.updateOne(
						filter,
						updateuser,
						options,
					);
					res.json(result);
					console.log("Successfully replaced or added user", result);
				} else {
					res
						.status(403)
						.json({ message: "You don't have access to make new Admin" });
				}
			}
		});
		//To update order status
		app.put("/orders", async (req, res) => {
			console.log(req.body);
			const order = req.body;
			const filter = { orderId: order?.orderId };
			console.log("Request to change order status", order);
			const options = { upsert: true };
			const updateOrder = {
				$set: {
					orderStatus: order?.orderStatus,
				},
			};
			const result = await ordersCollection.updateOne(
				filter,
				updateOrder,
				options,
			);
			res.json(result);
			console.log("Successfully replaced order status", result);
		});
		/* ------
        ------Show all
        ------ */

		//To Show all users
		app.get("/users", async (req, res) => {
			console.log(req.query);
			const get = usersCollection.find({});
			console.log("Request to find users");
			users = await get.toArray();
			res.send(users);
			console.log("Found all users", users);
		});
		//To load single user order data by username
		app.get("/myorders", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const result = await ordersCollection
				.find({ orderedBy: user?.userName })
				.toArray();
			res.send(result);
			console.log("Found one", result);
		});
		//To load single user order data by seller name
		app.get("/postedBy", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const result = await ordersCollection
				.find({ postedBy: user?.postedBy })
				.toArray();
			res.send(result);
			console.log("Found one", result);
		});
		//To load single seller gigs data by seller name
		app.get("/sellergigs", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const result = await gigsCollection
				.find({ postedBy: user?.postedBy })
				.toArray();
			res.send(result);
			console.log("Found one", result);
		});
		//To load single user data by email
		app.get("/singleUsers", async (req, res) => {
			const user = req.query;
			console.log("user", user);
			const filter = { email: user?.email };
			console.log("from UI", filter);
			console.log("Request to find ", filter);
			const result = await usersCollection.findOne(filter);
			res.send(result);
			console.log("Found one", result);
		});
		//To Show all gigs
		app.get("/gigs", async (req, res) => {
			console.log(req.query);
			const get = gigsCollection.find({});
			console.log("Request to find gigs");
			gigs = await get.toArray();
			res.send(gigs);
			console.log("Found all gigs", gigs);
		});
		//To Show all orders
		app.get("/orders", async (req, res) => {
			console.log(req.query);
			const get = ordersCollection.find({});
			console.log("Request to find orders");
			orders = await get.toArray();
			res.send(orders);
			console.log("Found all orders", orders);
		});

		//To load single orders by id
		app.get("/orders/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to find ", id);
			const findId = { _id: ObjectId(id) };
			const result = await ordersCollection.findOne(findId);
			res.send(result);
			console.log("Found one", result);
		});
		//To load gigs orders by id
		app.get("/gigs/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to find ", id);
			const findId = { _id: ObjectId(id) };
			const result = await gigsCollection.findOne(findId);
			res.send(result);
			console.log("Found one", result);
		});
		//To load single users by id
		app.get("/users/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to find ", id);
			const findId = { _id: ObjectId(id) };
			const result = await usersCollection.findOne(findId);
			res.send(result);
			console.log("Found one", result);
		});

		/* ------
        ------delete all
        ------ */

		//To Delete order one by one
		app.delete("/orders/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await ordersCollection.deleteOne(deleteId);
			res.send(result);
			console.log("order Successfully Deleted", result);
		});
		//To Delete gigs one by one
		app.delete("/gigs/:id", async (req, res) => {
			const id = req.params.id;
			console.log("Request to delete ", id);
			const deleteId = { _id: ObjectId(id) };
			const result = await gigsCollection.deleteOne(deleteId);
			res.send(result);
			console.log("user Successfully Deleted", result);
		});
	} finally {
		//await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Online Marketplace Server is running just fine");
});

app.listen(port, () => {
	console.log("Online Marketplace  Server running on port :", port);
});

const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../index");
const User = require("../database/models/users");
const mongoose = require("../database/dbConection");
const UserService = require("../database/services/users");
const RecipeService = require("../database/services/recipes");
let id;
let token;

describe("test the recipes API", () => {
  beforeAll(async () => {
    // create a test user
    const password = bcrypt.hashSync("okay", 10);
    await User.create({
      username: "admin",
      password,
    });
  });

  afterAll(async () => {
    await User.deleteMany();
    mongoose.disconnect();
  });

  // test login
  describe("POST /login", () => {
    it("authenticate user and sign him in", async () => {
      const user = {
        username: "admin",
        password: "okay",
      };
      const res = await request(app).post("/login").send(user);
      token = res.body.accessToken;
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          accessToken: res.body.accessToken,
          success: true,
          data: expect.objectContaining({
            id: res.body.data.id,
            username: res.body.data.username,
          }),
        })
      );
    });
    it("should sign him in, password field cannot be empty", async () => {
      const user = {
        username: "admin",
      };
      const res = await request(app).post("/login").send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "username or password can not be empty",
        })
      );
    });
    it("should sign him in, username field cannot be empty", async () => {
      const user = {
        password: "okay",
      };
      const res = await request(app).post("/login").send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "username or password can not be empty",
        })
      );
    });
    it("should sign him in, username does not exist", async () => {
      const user = {
        username: "dev",
        password: "okay",
      };
      const res = await request(app).post("/login").send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Incorrect username or password",
        })
      );
    });
    it("should sign him in, incorrect password", async () => {
      const user = {
        username: "admin",
        password: "pass123",
      };
      const res = await request(app).post("/login").send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Incorrect username or password",
        })
      );
    });
    it("should not sign him in, internal server error", async () => {
      const user = {
        username: "admin",
        password: "okay",
      };
      jest
        .spyOn(UserService, "findByUsername")
        .mockRejectedValueOnce(new Error());
      const res = await request(app).post("/login").send(user);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "login failed.",
        })
      );
    });
  });

  // test create recipes
  describe("POST /recipes", () => {
    it("should save new recipe to db", async () => {
      const recipe = {
        name: "chicken nuggets",
        difficulty: 2,
        vegetarian: true,
      };
      const res = await request(app)
        .post("/recipes")
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      id = res.body.data._id;
      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
    it("should not save new recipe to db, invalid vegetarian value", async () => {
      const recipe = {
        name: "chicken nuggets",
        difficulty: 3,
        vegetarian: "true",
      };
      const res = await request(app)
        .post("/recipes")
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "vegetarian field should be boolean",
        })
      );
    });
    it("should not save new recipe to db, empty name field", async () => {
      const recipe = {
        name: "",
        difficulty: 3,
        vegetarian: true,
      };
      const res = await request(app)
        .post("/recipes")
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "name field can not be empty",
        })
      );
    });
    it("should not save new recipe to db, invalid difficulty value", async () => {
      const recipe = {
        name: "jollof rice",
        difficulty: "2",
        vegetarian: true,
      };
      const res = await request(app)
        .post("/recipes")
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "difficulty field should be a number",
        })
      );
    });
    it("should not save new recipe to db, invalid token", async () => {
      const recipe = {
        name: "chicken nuggets",
        difficulty: 2,
        vegetarian: true,
      };
      const res = await request(app)
        .post("/recipes")
        .send(recipe)
        .set("Authorization", "Bearer h89dyf87sduf89eu93d3d3dsafjk");
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Unauthorized",
        })
      );
    });
    it("should not save new recipe to db, internal server error", async () => {
      const recipe = {
        name: "chicken nuggets",
        difficulty: 2,
        vegetarian: true,
      };
      jest
        .spyOn(RecipeService, "saveRecipes")
        .mockRejectedValueOnce(new Error());
      const res = await request(app)
        .post("/recipes")
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Failed to save recipes!",
        })
      );
    });
  });

  // test get all recipes
  describe("GET /recipes", () => {
    it("should retreive all the recipes from db", async () => {
      const res = await request(app).get("/recipes");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
    it("should not retreive any recipe from db, internal server error", async () => {
      jest
        .spyOn(RecipeService, "allRecipes")
        .mockRejectedValueOnce(new Error());
      const res = await request(app).get("/recipes");
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Some error occurred while retrieving recipes.",
        })
      );
    });
  });

  // test get a particular recipe
  describe("GET /recipes/:id", () => {
    it("should retrieve the specified recipe from the db", async () => {
      const res = await request(app).get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
    it("should not retrieve any recipe from the db, invalid id value", async () => {
      const dummyId = "98ue89u928u98rq398u398";
      const res = await request(app).get(`/recipes/${dummyId}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: `Recipe with id ${dummyId} does not exist`,
        })
      );
    });
    it("should not retrieve any recipe from the db, internal server error", async () => {
      jest.spyOn(RecipeService, "fetchById").mockRejectedValueOnce(new Error());
      const res = await request(app).get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "Some error occurred while retrieving recipe details.",
        })
      );
    });
  });

  // test update a recipe
  describe("PATCH /recipes/:id", () => {
    it("should update the specified recipe record in db", async () => {
      const recipe = {
        name: "chicken nuggets",
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });
    it("should not update the specified recipe record in db, invalid difficulty value", async () => {
      const recipe = {
        difficulty: "2",
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "difficulty field should be a number",
        })
      );
    });
    it("should not update the specified recipe record in db, invalid vegetarian value", async () => {
      const recipe = {
        vegetarian: "true",
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "vegetarian field should be boolean",
        })
      );
    });
    it("should not update the specified recipe record in the db, invalid id", async () => {
      const recipe = {
        difficulty: 2,
      };
      const dummyId = "h9ds8uf94u89du98cu9";
      const res = await request(app)
        .patch(`/recipes/${dummyId}`)
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: `Recipe with id ${dummyId} does not exist`,
        })
      );
    });
    it("should not update the specified recipe record in db, invalid token", async () => {
      const recipe = {
        name: "chicken nuggets",
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set("Authorization", "Bearer klcs9yf923u8f9ieu9fdu9");
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Unauthorized",
        })
      );
    });
    it("should not update the specified recipe record in db, no update passed", async () => {
      const recipe = {};
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "field should not be empty",
        })
      );
    });
    it("should not update any recipe record in db, internal server error", async () => {
      const recipe = {
        name: "Chicken Kabab",
      };
      jest
        .spyOn(RecipeService, "fetchByIdAndUpdate")
        .mockRejectedValueOnce(new Error());
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "An error occured while updating recipe",
        })
      );
    });
  });

  // test delete a recipe
  describe("DELETE /recipes/:id", () => {
    it("should delete the specified recipe record in db", async () => {
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Recipe successfully deleted",
        })
      );
    });
    it("should not delete the specified recipe record from db, invalid token", async () => {
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set("Authorization", "Bearer isdu89veuf89ds8u38f4hyfd89");
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: "Unauthorized",
        })
      );
    });
    it("should not delete any recipe record from db, internal server error", async () => {
      jest
        .spyOn(RecipeService, "fetchByIdAndDelete")
        .mockRejectedValueOnce(new Error());
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: "An error occured while deleting recipe",
        })
      );
    });
  });
});

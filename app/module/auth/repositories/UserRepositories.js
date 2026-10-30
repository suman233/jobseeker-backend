const { UserModel } = require("../model/user");

const UserRepositories = {
  // User Registration
  UserRegistration: async (data) => {
    try {
      const user = await UserModel.create(data);
      return user;
    } catch (err) {
      console.log("Error in registration: ", err.message);
      throw new Error("Database opration failed.");
    }
  },
};

module.exports = UserRepositories;

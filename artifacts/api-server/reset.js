import bcrypt from "bcryptjs";

const hash = await bcrypt.hash("admin", 12);
console.log(hash);

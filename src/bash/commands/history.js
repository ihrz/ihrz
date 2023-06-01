const fs = require("fs"), path = require("path"),
  filePath = path.join(process.cwd(), 'src', 'bash', 'history', '.bash_history'),
  logger = require(`${process.cwd()}/src/core/logger`);

module.exports = function () {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) throw err;
    console.log("\n" + data + "\n[Press Enter]");
  }
  );
};
var log = function(msg) {
  if (process.env.NODE_ENV == 'production') {
    console.log(msg);
  }
};

module.exports = {
  log: log
};

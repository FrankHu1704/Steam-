// Nunca guardamos o IP em bruto — só um hash com um salt secreto, para conseguirmos
// aproximar "visitantes únicos" sem reter dados pessoais desnecessários.

const crypto = require("crypto");

function hashIp(ip) {
  const salt = process.env.TRACKING_SALT;
  if (!ip || !salt) return null;
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

module.exports = { hashIp };

const phoneNumberFormatter = function (number) {
  // menghilangka karakter selain angka
  let formatted = number.replace(/\D/g, '');
  //   menghilangkan awalan angka 0 dan diganti dengan 62
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substr(1);
  }
  if (!formatted.endsWith('@c.us')) {
    formatted += '@c.us';
  }
  return formatted;
};
module.exports = {
  phoneNumberFormatter,
};

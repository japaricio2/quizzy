function copy() {
  console.log(this);
  var tmp = document.createElement("input");
  tmp.setAttribute("value", this.baseURI + this.value);
  document.body.appendChild(tmp);
  tmp.select();
  document.execCommand("copy");
  document.body.removeChild(tmp);
}

function addListener() {
  var shareLinks = document.querySelectorAll('.share-button');
  shareLinks.forEach(function(link) {
    link.addEventListener('click', copy);
  });
}
addListener();



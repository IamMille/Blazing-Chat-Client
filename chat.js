
window.addEventListener("load", () => {
////////////////////////////////////////

$.noConflict(); // disabe bootstraps jQuery

alertify.logPosition("bottom right");
alertify.maxLogItems(2);

$("#startChat").addEventListener("click", startChat);
doLogin();

// var database = firebase.database();

////////////////////////////////////////
}); // end of load
// end of load

function startChat()
{
  var username = $("#username").value;
  if (username && username.length < 1) {
    alert("Enter a username with atleast 1 characters long"); return; }

  sessionStorage.setItem("username", username);
  doLogin();
}

function doLoadChat() {
  //$("#chat").innerText = "Hello " + $("#username").value;
  // load data
    //loop doAddMessage
  data.forEach( chatmsg => {
    doAddMessage(chatmsg);
  });

}
function doAddMessage(oMsg)
{
  var keysRequired = ["id", "datetime", "chan", "user", "msg"];
  if (keysRequired.filter(key => oMsg[key]).length != keysRequired.length) {
    console.log("doAddMessage(): missing parameters, need", keysRequired.length, "got:", Object.keys(oMsg) ); return; }

  console.log(oMsg);
  var div = document.createElement("div");
  div.setAttribute("data-id", oMsg.id);
  div.classList.add("msg");
  div.innerHTML = `
    <div class="icons">
      <span class="glyphicon glyphicon-thumbs-up"></span>
      <span class="glyphicon glyphicon-thumbs-down"></span>
    </div>
    <div class="text">
      (${oMsg.datetime.slice(-8)})
      &lt;<b>${oMsg.user}</b>&gt; ${oMsg.msg}
    </div>
  `.trim();

  $("#chatMsgs").appendChild(div);

}

function doLogin()
{
  var username = sessionStorage.getItem("username");
  if (!username) { doLogout(); return; }
  $("#username").value = username;

  $("#navLogin").innerHTML = '<li><a href="#">Log Out</a></li>';
  $("#navLogin li:first-child a").addEventListener("click", doLogout);
  $("#inputUsername").style.display = "";
  $("#chatWindow").style.display = "block";

  console.log("User is logged in.");
  alertify.success("You've been logged in!");

  doLoadChat();
}

function doLogout(event)
{
  sessionStorage.removeItem("username");
  $("#navLogin").innerHTML = "";
  $("#inputUsername").style.display = "block";
  $("#chatWindow").style.display = "";
  //disable input.
  //disable updates.
  console.log("User is logged out.");
  if (event) alertify.log("You've been logged out.");
}

function $(str)
{
  var els = document.querySelectorAll(str);
  if (els.length === 1 && str.indexOf("#") > -1) return els[0];
  else if (els.length > 0) return Array.from(els);
  else return [];
}

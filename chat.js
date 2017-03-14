
window.addEventListener("load", () => {
////////////////////////////////////////

alertify.logPosition("bottom right");
alertify.maxLogItems(2);

$("#startChat").addEventListener("click", startChat);
doLogin();

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
}
function doAddMessage() {
  /*
  <div class="msg" data-id="12312">
    (12:34:59) &lt;<b>username</b>&gt; Ett chatt meddelande ser ut såhär!
    <span class="glyphicon glyphicon-thumbs-up"></span>
    <span class="glyphicon glyphicon-thumbs-down"></span>
  </div>
  */
}

function doLogin()
{
  var username = sessionStorage.getItem("username");
  if (!username) { doLogout(); return; }
  $("#username").value = username;

  $("#navLogin").innerHTML = '<li><a href="#">Log Out</a></li>';
  $("#navLogin li:first-child a").addEventListener("click", doLogout);
  $("#inputUsername").style.display = "";
  $("#chat").style.display = "block";

  console.log("User is logged in.");
  alertify.success("You've been logged in!");

  doLoadChat();
}

function doLogout(event)
{
  sessionStorage.removeItem("username");
  $("#navLogin").innerHTML = "";
  $("#inputUsername").style.display = "block";
  $("#chat").style.display = "";
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

////////////////////////////////////////
}); // end of load
// end of load

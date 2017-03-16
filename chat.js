
window.addEventListener("load", () => {
////////////////////////////////////////

$.noConflict(); // disabe bootstraps jQuery

alertify.logPosition("bottom right");
alertify.maxLogItems(2);

$("#startChat").addEventListener("click", startChat);
$("#chatInput input").addEventListener("keyup", putChatMsg);

doLogin();

////////////////////////////////////////
}); // end of load
// end of load

window.addEventListener("unload", () => {
  var username = $("#username").value;
  firebase.database().ref(`users/${username}`).set(null);
});

function startChat()
{
  var username = $("#username").value;
  if (username && username.length < 1) {
    alert("Enter a username with atleast 1 characters long"); return; }

  sessionStorage.setItem("username", username);
  doLogin();
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

  firebase.database().ref(`users/${username}`).set({
    datetime: datetime()
  });

  doLoadChat();
}

function doLoadChat()
{
  $("#chatMsgs").innerHTML = "";

  firebase.database().ref('msgs/').on('child_added', getChatMsgs);
  firebase.database().ref('users/').on('value', getChatUsers);

  scrollTo( document.body, 700, 600);
}
function getChatUsers(snapshot)
{
  var userObject = snapshot.val();

  var div = document.createElement("div");
  div.innerText = Object.keys(userObject)[0];

  $("#userList").innerHTML = '<h4>Users</h4>';
  $("#userList").appendChild(div);
}

function putChatMsg(e)
{
  if (e.key != "Enter") return;
  console.log("putChatMsg()");

  var newId = firebase.database().ref().child('msgs').push().key;
  //["id", "datetime", "chan", "user", "msg"];
  firebase.database().ref(`msgs/${newId}`).set({
    datetime: datetime(),
    chan: "#general",
    user: $("#username").value,
    msg:  $("#chatInput input").value
  });
  $("#chatInput input").value = "";
}

function getChatMsgs(snapshot)
{
  doAddMessage(snapshot.val());
}

function doAddMessage(oMsg)
{
  var keysRequired = ["datetime", "chan", "user", "msg"];
  if (keysRequired.filter(key => oMsg[key]).length != keysRequired.length) {
    console.log("doAddMessage(): missing parameters, need", keysRequired.length, "got:", Object.keys(oMsg) ); return; }

  //console.log(oMsg);
  var div = document.createElement("div");
  div.setAttribute("data-id", oMsg.id || "");
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
  scrollToBottom();
}

function scrollToBottom() {
  var divMsgs = $("#chatMsgs");
  divMsgs.scrollTop = divMsgs.scrollHeight - divMsgs.clientHeight;
}

function doLoginGithub()
{
  console.log( "doLoginGithub() start" );
  var provider = new firebase.auth.GithubAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then( result => {
      var token = result.credential.accessToken;
      var user = result.user;

      console.log("doLoginGithub: ", result);

      $("#navLogin").innerHTML = '<li><a href="#">Log Out</a></li>';
      $("#navLogin li:first-child a").addEventListener("click", doLogout);
      $("#inputUsername").style.display = "";
      $("#chatWindow").style.display = "block";

      console.log("User is logged in.");
      alertify.success("Welcome " + user.displayName);

    }).catch( error => {
      var errorCode = error.code;
      var errorMessage = error.message;
      var email = error.email;
      var credential = error.credential; // The firebase.auth.AuthCredential type that was used.
      console.log("doLoginGithub() failed:", error);
      doLogout();
    });
}

function doLogout(event)
{
  sessionStorage.removeItem("username");
  $("#navLogin").innerHTML = "";
  $("#inputUsername").style.display = "block";
  $("#chatWindow").style.display = "";
  //disable input.
  //disable updates.

  //firebase.auth().signOut()
    //.then( result => console.log("Firebase singout successfull"))
    //.catch( error => console.log("Firebase singout failed. Perhaps not logged in?"));

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

function scrollTo(element, to, duration) {
    if (duration <= 0) return;
    var difference = to - element.scrollTop;
    var perTick = difference / duration * 10;

    setTimeout(function() {
        element.scrollTop = element.scrollTop + perTick;
        if (element.scrollTop === to) return;
        scrollTo(element, to, duration - 10);
    }, 10);
}

function datetime() {
  return (new Date()).toISOString().replace('T', ' ').replace(/\..*$/, '');
}

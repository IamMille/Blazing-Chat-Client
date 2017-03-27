class App
{
  constructor() {
    usr = new User();
    dom = new Dom();
    app = this;

    this.doInit();
    this.doLogin();
  }

  doInit() {
    $("#startChat").addEventListener("click", app.doLogin.bind(app));
    $("#chatInput input").addEventListener("keyup", app.registerChatMsg.bind(app));
  }

  doLogin() {
    if (!(usr.hasValidNickname())) { dom.displayLogout(); return; }

    if (usr.nickname.substr(0,5) != "Guest")
      localStorage.setItem("username", usr.nickname);

    dom.displayLogin();

    // check duplicate username
    db.ref('users/')
      .orderByKey().equalTo(usr.nickname) // orderBy() needed for equalTo()
      .once("value").then(snapshot => {

      if (snapshot.val()) { // is duplicate
        usr.nickname = "Guest" + ("00000" + Math.floor(Math.random() * 99999) ).substr(-5,5);
        alertify.delay(5).log(`Nickname ${usr.nickname} in use.`);
        alertify.delay(7).log(`You have been rename to ${usr.nickname}`);
      }

      // Sync with server before JOIN
      db.ref('msgs/').once('value', () =>
      {
        var nick = usr.nickname;

        db.ref(`users/${nick}`).set({ timestamp: TMS });

        if (nick != 'Mille') {  // skip log JOIN
          let newId = db.ref().child('msgs').push().key;
          db.ref(`msgs/${newId}`).set({
            "event": "JOIN",
            timestamp: TMS,
            chan: "#general",
            user: nick,
            msg: false // null would remove the node
          });
        }

        // add onDisconnect listeners
        db.ref(`users/${nick}`).onDisconnect().cancel(); // needed if logout, then login
        db.ref(`users/${nick}`).onDisconnect().set(null);

        if (nick != "Mille") { // skip log PART
          let newId = db.ref().child('msgs').push().key;
          db.ref(`msgs/${newId}`).onDisconnect().cancel();
          db.ref(`msgs/${newId}`).onDisconnect().set({
            'event': "PART",
            timestamp: TMS,
            chan: "#general",
            user: nick, // exists for first time user???
            msg: false
          });
        }
      }); // sync END

      db.ref('msgs/').on('child_added', dom.insertChatMsg.bind(dom));
      db.ref('users/').on('value', dom.updateUserlist.bind(dom));
      db.ref('likes/').on('child_added', dom.updateLike.bind(dom, "added"));
      db.ref('likes/').on('child_changed', dom.updateLike.bind(dom, "changed"));
      db.ref('likes/').on('child_removed', dom.updateLike.bind(dom, "removed"));

    }); // onValue END

  } // doLogin END

  doLogout(event) { // can be triggered by onUnload event
    dom.displayLogout();
    if (event) alertify.log("You've been logged out.");
    db.goOffline(); //trigger firebase disconnect
    db.goOnline();
  }

  registerChatMsg(event) {
    if (event.key != "Enter") return;

    db.ref('msgs/').push({
      'event': "PRIVMSG",
      timestamp: TMS,
      chan: "#general",
      user: usr.nickname,
      msg:  $("#chatInput input").value
    });

    $("#chatInput input").value = "";
    $("#chatInput input").disabled = true;
    setTimeout(() => {
        $("#chatInput input").disabled = false;
        $("#chatInput input").focus();
    }, 700);
  }

  registerChatLike(event) {
    var el = event.target, like;

    if (el.classList.contains("me")) // user is resetting like
      like = null;
    else if (el.classList.contains('glyphicon-thumbs-up'))
      like = true;
    else if (el.classList.contains('glyphicon-thumbs-down'))
      like = false;

    var msgId = el.parentElement.parentElement.getAttribute("data-id");
    db.ref().update({ [`likes/${msgId}/${usr.nickname}`]: like });
  }

}

class User
{
  set nickname(val) {
    if (val) $("#username").value = val;
  }
  get nickname() {
    return $("#username").value.trim();
  }
  hasValidNickname()
  {
    if (!Boolean(usr.nickname))
      return;
    else if (usr.nickname.length < 2)
      alert("Choose a nickname at least 2 characters long");
    else if (usr.nickname.match(/\s/))
      alert("Choose a nickname without blankspaces");
    else
      return true;
  }
}

class Dom
{
  constructor() {
    $("#username").value = localStorage.getItem("username");
  }

  displayLogin() {
    $("#navLogin").innerHTML = '<li><a href="#">Log Out</a></li>';
    $("#navLogin li:first-child a").addEventListener("click", app.doLogout.bind(app));
    $("#inputUsername").style.display = "none";
    $("#chatWindow").style.display = "block";
    $("#chatMsgs").innerHTML = "";

    alertify.success("You've been logged in!");
  }

  displayLogout() {
    $("#navLogin").innerHTML = "";
    $("#inputUsername").style.display = "block";
    $("#chatWindow").style.display = "";
  }

  updateUserlist(snapshot) { // onValue
    $("#userList").innerHTML = '<h4>Users</h4>';

    snapshot.forEach( snap => {
      var div = document.createElement("div");
      div.innerText = snap.key;
      $("#userList").appendChild(div);
    });
  }

  updateLike(eventName, snapshot) { // onChildAdded onChildChanged onChildRemoved
    var likes = snapshot.val();
    var msgId = snapshot.key;
    var likesUsers = [], dislikesUsers = [];

    for (var user in likes) {
      if (eventName == "removed") {}
      else if (likes[user] === true) likesUsers.push(user);
      else if (likes[user] === false) dislikesUsers.push(user);
    }

    var div = $(`#chatMsgs div[data-id='${msgId}'] .icons`);
    if (!div || div.length === 0) {
      console.warning("updateLike(): msg does not exist:", msgId); return; }

    div.innerHTML = `
        <span class="glyphicon glyphicon-thumbs-up">${likesUsers.length}</span>
        <span class="glyphicon glyphicon-thumbs-down">${dislikesUsers.length}</span>
    `;

    var divThup = div.querySelector("span[class='glyphicon glyphicon-thumbs-up']");
    var divThdw = div.querySelector("span[class='glyphicon glyphicon-thumbs-down']");
    divThup.addEventListener("click", app.registerChatLike.bind(app));
    divThdw.addEventListener("click", app.registerChatLike.bind(app));

    if (likesUsers.length > 0) divThup.setAttribute("title", likesUsers.join(", "));
    if (dislikesUsers.length > 0) divThdw.setAttribute("title", dislikesUsers.join(", "));

    var nick = usr.nickname;
    if (likesUsers.indexOf(nick) > -1) divThup.classList.add("me");
    else if (dislikesUsers.indexOf(nick) > -1) divThdw.classList.add("me");

    if (likesUsers.length + dislikesUsers.length > 0) div.classList.add("show");
    else div.classList.remove("show");
  }

  insertChatMsg(snapshot)  // onChildAdded
  {
    var oMsg = snapshot.val();
        oMsg.id = snapshot.key;

    var keysRequired = ["chan", "event", "msg", "timestamp", "user"],
        keysRecivied = keysRequired.filter(key => oMsg.hasOwnProperty(key));

    if (keysRecivied.length != keysRequired.length) {
      console.warning("doAddMessage(): missing parameters, \nneed:", keysRequired, "\ngot: ", keysRecivied, "\npayload:", oMsg ); return; }

    // if msg already exist delete
    $(`div[data-id='${oMsg.id}']`).forEach( el => el.outerHTML = "" );

    // convert unix epoch to time
    oMsg.time = (new Date(oMsg.timestamp)).toTimeString().slice(0,8); //hh:mm:ss

    var div = document.createElement("div");
    div.setAttribute("data-id", oMsg.id || "");
    div.classList.add("msg");

    div.innerHTML =`
      <div class="icons">
        <span class="glyphicon glyphicon-thumbs-up">0</span>
        <span class="glyphicon glyphicon-thumbs-down">0</span>
      </div>
    `;

    switch(oMsg.event)
    {
      case 'PRIVMSG':
        div.innerHTML += `
          <div class="text">
            (${oMsg.time})
            &lt;<b>${oMsg.user}</b>&gt; ${oMsg.msg}
          </div>
        `; break;

      case 'JOIN':
        div.innerHTML += `
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> joined the chat.
          </div>
        `; break;

      case 'PART':
        div.innerHTML += `
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> left the chat.
          </div>
        `; break;
    } // switch end

    // remove multiple whitespaces for cleaner dom?
    div.innerHTML = div.innerHTML.replace(/(\s)+/, "$1");

    div.querySelector("span[class='glyphicon glyphicon-thumbs-up']")
       .addEventListener("click", app.registerChatLike.bind(app));

    div.querySelector("span[class='glyphicon glyphicon-thumbs-down']")
       .addEventListener("click", app.registerChatLike.bind(app));

    $("#chatMsgs").appendChild(div);
    $("#chatMsgs").scrollTop = $("#chatMsgs").scrollHeight - $("#chatMsgs").clientHeight;
  }
} // Dom() END


/////////////////////////////// GLOBAL ///////////////////////////
var app, dom, usr, db;
const TMS = firebase.database.ServerValue.TIMESTAMP;

window.addEventListener("load", () =>
{
  $.noConflict(); // disable bootstraps jQuery

  alertify.logPosition("bottom right");
  alertify.maxLogItems(2);

  db = firebase.database();
  app = new App();
});

function $(str)
{
  var els = document.querySelectorAll(str);
  if (els.length === 1 && str.indexOf("#") > -1) return els[0];
  else if (els.length > 0) return Array.from(els);
  else return [];
}

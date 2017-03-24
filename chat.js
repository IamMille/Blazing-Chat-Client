class App
{
  constructor(isCalledFromExtended) {
    if (isCalledFromExtended) return; // hacky?
    this.user = new User();
    this.dom = new Dom();
    this.doInit();
    this.doLogin();
  }

  static test() {
    console.log("$$");
  }

  doInit()
  {
    // monitor online presence
    firebase.database().goOffline();
    firebase.database().ref(".info/connected").on('value', (snapshot) =>
    {
      if (snapshot.val()) { // User is online.
        console.log( (new Date()).getTime(), "USER ONLINE" );

        var newId = firebase.database().ref().child('msgs').push().key;
        firebase.database().ref(`users/${this.user.nickname}`).onDisconnect().remove();
        firebase.database().ref(`users/${this.user.nickname}`).onDisconnect().set(null);
        firebase.database().ref(`msgs/${newId}`).onDisconnect().remove();
        firebase.database().ref(`msgs/${newId}`).onDisconnect().set({
          'event': "PART",
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          chan: "#general",
          user: this.user.nickname,
          msg: false
        });
      }
    }); // onConnected END
  }

  doTerminate() { // TODO: test this!!
    if (this.user.nickname) this.dom.displayLogout();
  }

  doLogin() {
    if (!(this.user.hasValidNickname())) { this.dom.displayLogout(); return; }

    //test();
    localStorage.setItem("username", this.user.nickname);
    this.dom.displayLogin();

    firebase.database().goOnline();

    // make firebase cache the results before adding JOIN
    firebase.database().ref('msgs/').once('value', () =>
    {

      if (this.user.nickname != 'Mille')  //TODO: skip during debugging
      {
        var newId = firebase.database().ref().child('msgs').push().key;
        firebase.database().ref(`msgs/${newId}`).set({
          "event": "JOIN",
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          chan: "#general",
          user: this.user.nickname,
          msg: false // null would remove the node
        });
      }

      firebase.database().ref(`users/${this.user.nickname}`).set({
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });

      //console.log( (new Date()).getTime(), "cache complete, add JOIN" );
    });

    firebase.database().ref('msgs/').on('child_added', this.dom.insertChatMsg.bind(this));
    firebase.database().ref('users/').on('value', this.dom.updateUserlist.bind(this));
    firebase.database().ref('likes/').on('child_added', this.dom.updateLike.bind(this, "added"));
    firebase.database().ref('likes/').on('child_changed', this.dom.updateLike.bind(this, "changed"));
    firebase.database().ref('likes/').on('child_removed', this.dom.updateLike.bind(this, "removed"));

  } // doLogin END

  doLogout(event) { // can be triggered by onUnload event
    console.log( "App::doLogout() this:", this );

    this.displayLogout();
    //localStorage.removeItem("username");

    //firebase.auth().signOut()
      //.then( result => console.log("Firebase singout successfull"))
      //.catch( error => console.log("Firebase singout failed. Perhaps not logged in?"));
    firebase.database().goOffline();

    console.log("User is logged out.");
    if (event) alertify.log("You've been logged out.");


  }

  registerChatMsg(event) {
    if (event.key != "Enter") return;

    var newId = firebase.database().ref().child('msgs').push().key;

    firebase.database().ref(`msgs/${newId}`).set({
      'event': "PRIVMSG",
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      chan: "#general",
      user: this.user.nickname,
      msg:  $("#chatInput input").value
    });
    $("#chatInput input").value = "";
  }

  registerChatLike(event) {
    var el = event.target, like;

    if (el.classList.contains("me")) // user is resetting like
      like = null;
    else if (el.classList.contains('glyphicon-thumbs-up'))
      like = true;
    else if (el.classList.contains('glyphicon-thumbs-down'))
      like = false;

    var msgid = el.parentElement.parentElement.getAttribute("data-id");

    console.log("App::registerChatLike():", msgid, like);

    var updates = {};
    updates[`likes/${msgid}/${this.user.nickname}`] = like;
    firebase.database().ref().update(updates);

    /*firebase.database()
      .ref(`likes/${msgid}/`)
      .on("value", snapshot => {
        console.log("after delete ref:", snapshot.val());
        this.dom.updateLike(snapshot).bind(this);

      });*/

    /*firebase.database()
      .ref(`likes/${msgid}/${this.user.nickname}`)
      .transaction( currentValue => {

        if (currentValue === like) {
          console.log("registerChatLike reset");
          return null; // reset users like
        }
        else return like;

      }, (error, committed, snapshot) => {

        if (error)
          console.log('Transaction failed abnormally!', error);
        else if (!committed)
          console.log('Transaction aborted.');
        else
          console.log('Transaction completed.', committed);
      }, false);*/

  }

}

class User extends App
{
  constructor(parent) {
      super(true);
      this.parent = Object.getPrototypeOf(this);
  }

  set nickname(val) {
    if (val) $("#username").value = val;
  }
  get nickname() {
    return $("#username").value.trim();
  }
  hasValidNickname()
  {
    var nick = this.nickname;

    if (!Boolean(nick))
      return;
    else if (nick.length < 2)
      alert("Choose a nickname at least 2 characters long");
    else if (nick.match(/\s/))
      alert("Choose a nickname without blankspaces");
    else
      return true;
  }
}

class Dom extends App
{
  constructor()
  {
    super(true);
    this.parent = this.__proto__; //Object.getPrototypeOf(this);
    $("#username").value = localStorage.getItem("username");
  }

  displayLogin()
  {
    $("#navLogin").innerHTML = '<li><a href="#">Log Out</a></li>';
    $("#navLogin li:first-child a").addEventListener("click", this.doLogout.bind(this.__proto__));
    $("#inputUsername").style.display = "none";
    $("#chatWindow").style.display = "block";
    $("#chatMsgs").innerHTML = "";
    // disable input

    console.log("User is logged in.");
    alertify.success("You've been logged in!");
  }

  displayLogout()
  {
    $("#navLogin").innerHTML = "";
    $("#inputUsername").style.display = "block";
    $("#chatWindow").style.display = "";
    // enable input
  }

  updateUserlist(snapshot) // onValue
  {
    $("#userList").innerHTML = '<h4>Users</h4>';
    snapshot.forEach( snap => {
      var div = document.createElement("div");
      div.innerText = snap.key;
      $("#userList").appendChild(div);
    });
  }

  updateLike(eventName, snapshot) // onChildAdded onChildChanged onChildRemoved
  {
    var likes = snapshot.val();
    var msgId = snapshot.key;

    //console.log("Dom::updateLike()", snapshot, eventName, likes, msgId);

    var likesUsers = [], dislikesUsers = [];

    for (var user in likes) {
      if (eventName == "removed") {}
      else if (likes[user] === true) likesUsers.push(user);
      else if (likes[user] === false) dislikesUsers.push(user);
    }

    var div = $(`#chatMsgs div[data-id='${msgId}'] .icons`);
    if (!div || div.length === 0) {
      console.log("updateLike(): msg does not exist:", msgId);
      return;
    }

    div.innerHTML = `
        <span class="glyphicon glyphicon-thumbs-up">${likesUsers.length}</span>
        <span class="glyphicon glyphicon-thumbs-down">${dislikesUsers.length}</span>
    `.replace(/(\s)+/, "$1"); // remove multiple whitespaces for cleaner dom?

    var divThup = div.querySelector("span[class='glyphicon glyphicon-thumbs-up']");
    var divThdw = div.querySelector("span[class='glyphicon glyphicon-thumbs-down']");
    divThup.addEventListener("click", this.registerChatLike.bind(this));
    divThdw.addEventListener("click", this.registerChatLike.bind(this));

    var me = this.user.nickname;
    if (likesUsers.indexOf(me) > -1) divThup.classList.add("me");
    else if (dislikesUsers.indexOf(me) > -1) divThdw.classList.add("me");

    if (likesUsers.length + dislikesUsers.length > 0) div.classList.add("show");
    else div.classList.remove("show");

    //console.log(likesUsers.length, dislikesUsers.length);
  }

  insertChatMsg(snapshot)  // onChildAdded
  {
    var oMsg = snapshot.val();
        oMsg.id = snapshot.key;

    var keysRequired = ["chan", "event", "msg", "timestamp", "user"];
    var keysRecivied = keysRequired.filter(key => oMsg.hasOwnProperty(key));
    if (keysRecivied.length != keysRequired.length) {
      console.log("doAddMessage(): missing parameters, \nneed:", keysRequired, "\ngot: ", keysRecivied, "\npayload:", oMsg ); return; }

    // convert unix epoch to time
    oMsg.time = (new Date(oMsg.timestamp)).toTimeString().slice(0,8); //hh:mm:ss

    var div = document.createElement("div");
    div.setAttribute("data-id", oMsg.id || "");
    div.classList.add("msg");

    switch(oMsg.event)
    {
      case 'PRIVMSG':
        div.innerHTML = `
          <div class="icons">
            <span class="glyphicon glyphicon-thumbs-up">0</span>
            <span class="glyphicon glyphicon-thumbs-down">0</span>
          </div>
          <div class="text">
            (${oMsg.time})
            &lt;<b>${oMsg.user}</b>&gt; ${oMsg.msg}
          </div>
        `.trim(); break;

      case 'JOIN':
        div.innerHTML = `
          <div class="icons">
            <span class="glyphicon glyphicon-thumbs-up">0</span>
            <span class="glyphicon glyphicon-thumbs-down">0</span>
          </div>
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> joined the chat.
          </div>
        `.trim(); break;

      case 'PART':
        div.innerHTML = `
          <div class="icons">
            <span class="glyphicon glyphicon-thumbs-up">0</span>
            <span class="glyphicon glyphicon-thumbs-down">0</span>
          </div>
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> left the chat.
          </div>
        `.trim(); break;
    } // switch end

    div.querySelector("span[class='glyphicon glyphicon-thumbs-up']")
       .addEventListener("click", this.registerChatLike.bind(this));

    div.querySelector("span[class='glyphicon glyphicon-thumbs-down']")
       .addEventListener("click", this.registerChatLike.bind(this));

    $("#chatMsgs").appendChild(div);
    $("#chatMsgs").scrollTop = $("#chatMsgs").scrollHeight - $("#chatMsgs").clientHeight;
  }
} // Dom() END


/////////////////////////////// EVENTS ///////////////////////////
var app;

function $(str)
{
  var els = document.querySelectorAll(str);
  if (els.length === 1 && str.indexOf("#") > -1) return els[0];
  else if (els.length > 0) return Array.from(els);
  else return [];
}

window.addEventListener("load", () =>
{
  $.noConflict(); // disabe bootstraps jQuery

  alertify.logPosition("bottom right");
  alertify.maxLogItems(2);

  app = new App();

  // move to App init
  $("#startChat").addEventListener("click", app.doLogin.bind(app));
  $("#chatInput input").addEventListener("keyup", app.registerChatMsg.bind(app));
}); // onLoad end

window.addEventListener("beforeunload", () => {
  app.terminate.bind(app);

  var newId = firebase.database().ref().child('msgs').push().key;
  firebase.database().ref(`users/${username}`).set(null);
  firebase.database().ref(`msgs/${newId}`).set({
    'event': "PART",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    chan: "#general",
    user: app.user.nickname,
    msg: false
  });

});

///////////////////////////// TEST ///////////////////////////////

function doLoginGithub()
{
  console.log( "doLoginGithub() start" );
  var provider = new firebase.auth.GithubAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then( result => {
      var token = result.credential.accessToken;
      var user = result.user;
      console.log(user);
    }).catch( error => {
      console.log("doLoginGithub() failed:", error);
      app.doLogout();
    });
}

// manual fix database entries
function firebaseAddDataColumn()
{
  firebase.database().ref('msgs/').once('value', snapshot => {
    for (let key in snapshot.val()) {
      var obj = snapshot.val()[key];
      //obj.event = "PRIVMSG";
      //obj.timestamp = (new Date(obj.datetime)).getTime();
      //if (!obj.msg) firebase.database().ref(`msgs/${key}`).set(null);
      if (obj.event == "JOIN" && obj.user == "Mille") {
        console.log("Mille join");
        firebase.database().ref(`msgs/${key}`).set(null);
      }
      var thisTimestamp = (new Date(obj.timestamp));
      var thisTime = thisTimestamp.getHours() + "" + thisTimestamp.getMinutes();
        if ( Number(thisTime) > 2208 ) {
          console.log("time is", thisTime);
          //obj.timestamp = obj.timestamp -= 3600000;
          console.log(obj);
          //firebase.database().ref(`msgs/${key}`).set(obj);
        }
    }
  });
}

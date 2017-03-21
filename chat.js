class App
{
  constructor(isCalledFromExtended) {
    if (isCalledFromExtended) return; // hacky?
    this.user = new User();
    this.dom = new Dom();
    this.doLogin();
  }

  doLogin() {
    if (!(this.user.hasValidNickname())) { this.dom.displayLogout(); return; }

    localStorage.setItem("username", this.user.nickname);
    this.dom.displayLogin();


    firebase.database().ref(`users/${this.user.nickname}`).set({
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    firebase.database().ref('users/').on('value', this.dom.updateUserlist);
    firebase.database().ref('msgs/').on('child_added', this.dom.insertChatMsg);

    //////////////////////////////////////////////////////
    if (this.user.nickname == 'Mille') return; //TODO: skip during debugging

    // save event in chat
    var newId = firebase.database().ref().child('msgs').push().key;
    firebase.database().ref(`msgs/${newId}`).set({
      "event": "JOIN",
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      chan: "#general",
      user: this.user.nickname,
      msg: false // null would remove the node
    });
  } // doLogin END

  doLogout(event) { // can be triggered by onUnload event
    console.log( "App::doLogout() this:", this );

    this.displayLogout();
    //localStorage.removeItem("username");

    //firebase.auth().signOut()
      //.then( result => console.log("Firebase singout successfull"))
      //.catch( error => console.log("Firebase singout failed. Perhaps not logged in?"));

    console.log("User is logged out.");
    if (event) alertify.log("You've been logged out.");

    if (this.user.nickname == "Mille") return; //TODO: debug

    var newId = firebase.database().ref().child('msgs').push().key;
    firebase.database().ref(`users/${username}`).set(null);
    firebase.database().ref(`msgs/${newId}`).set({
      'event': "PART",
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      chan: "#general",
      user: this.user.nickname,
      msg: false
    });

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
  constructor() {
    super(true);
    this.parent = Object.getPrototypeOf(this);
    $("#username").value = localStorage.getItem("username");
  }

  displayLogin() {
    $("#navLogin").innerHTML = '<li><a href="#">Log Out</a></li>';
    $("#navLogin li:first-child a").addEventListener("click", this.doLogout.bind(this.parent));
    $("#inputUsername").style.display = "none";
    $("#chatWindow").style.display = "block";
    $("#chatMsgs").innerHTML = "";
    // disable input

    console.log("User is logged in.");
    alertify.success("You've been logged in!");
  }

  displayLogout() {
    $("#navLogin").innerHTML = "";
    $("#inputUsername").style.display = "block";
    $("#chatWindow").style.display = "";
    // enable input
  }

  updateUserlist(snapshot) { // Firebase onValue
    $("#userList").innerHTML = '<h4>Users</h4>';
    snapshot.forEach( snap => {
      var div = document.createElement("div");
      div.innerText = snap.key;
      $("#userList").appendChild(div);
    });
  }

  insertChatMsg(snapshot) { // Firebase onChildAdded
    var oMsg = snapshot.val();
    //console.log(oMsg);
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
            <span class="glyphicon glyphicon-thumbs-up"></span>
            <span class="glyphicon glyphicon-thumbs-down"></span>
          </div>
          <div class="text">
            (${oMsg.time})
            &lt;<b>${oMsg.user}</b>&gt; ${oMsg.msg}
          </div>
        `.trim(); break;

      case 'JOIN':
        div.innerHTML = `
          <div class="icons">
            <span class="glyphicon glyphicon-thumbs-up"></span>
            <span class="glyphicon glyphicon-thumbs-down"></span>
          </div>
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> joined the chat.
          </div>
        `.trim(); break;

      case 'PART':
        div.innerHTML = `
          <div class="icons">
            <span class="glyphicon glyphicon-thumbs-up"></span>
            <span class="glyphicon glyphicon-thumbs-down"></span>
          </div>
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> left the chat.
          </div>
        `.trim(); break;
    } // switch end

    $("#chatMsgs").appendChild(div);
    $("#chatMsgs").scrollTop = $("#chatMsgs").scrollHeight - $("#chatMsgs").clientHeight;
  }
} // Dom() END

var app;

window.addEventListener("load", () =>
{
  $.noConflict(); // disabe bootstraps jQuery
  app = new App();

  alertify.logPosition("bottom right");
  alertify.maxLogItems(2);

  $("#startChat").addEventListener("click", app.doLogin.bind(app));
  $("#chatInput input").addEventListener("keyup", app.registerChatMsg.bind(app));
}); // onLoad end

window.addEventListener("unload", () => {
  if (app.user.nickname) app.dom.displayLogout();
});

function $(str)
{
  var els = document.querySelectorAll(str);
  if (els.length === 1 && str.indexOf("#") > -1) return els[0];
  else if (els.length > 0) return Array.from(els);
  else return [];
}


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

// manual edit database
function firebaseAddDataColumn() {
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

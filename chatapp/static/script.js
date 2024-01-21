var socket = io();

// Assuming u_id is a global variable or defined elsewhere in your code
var u_id;

const password = document.querySelector("#password");
const confirmpassword = document.querySelector("#confirm-password");
const errorText = document.getElementById("errorText");
const showbtn = document.querySelector(".show");

function active() {
    if (confirmpassword.value !== "") {
        showbtn.style.display = "block"; 
        showbtn.onclick = function () {
            if ((password.type == "password") && (confirmpassword.type == "password")) {
                password.type = "text";
                confirmpassword.type = "text";
                this.src = "static/images/hidden.png";
            } else {
                password.type = "password";
                confirmpassword.type = "password";
                this.src = "static/images/view.png";
            }
        };
    } else {
        showbtn.style.display = "none";
    }
}

function validate() {
    if (password.value !== confirmpassword.value) {
        errorText.style.display = "block";
        errorText.textContent = "Password Mismatch";
        return false;
    }
    return true;
}

function selectContact(u_id) {

    receiver_id = u_id;
    console.log(receiver_id,"reciever id");

    var contact = document.getElementById("contactname");
    contact.innerHTML = document.getElementById('names' + u_id).innerHTML;

    // if(status === "Online"){
    //     document.getElementById("status").innerHTML = status;
    // }
    // else{
    //     document.getElementById("status").innerHTML = "Last seen:"+status;
    // }
    

    

    clearChatContainer();
    loadPreviousMessage();
    // markMessageAsRead();


    fetch(`/mark_messages_as_read`,{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
        },
        body:JSON.stringify({}),
    })

    .then(response => response.json())
    .then(data => {
        console.log('Messages marked as read:', data);
        // if(data.status == "success"){
        //     document.getElementsByClassName("counter_container").style.display=none;
        // }

        // document.getElementById(u_id).innerHTML = '0';
        document.getElementById(u_id).style.display = 'none'; 
        
    })
    .catch(error => console.error("Error marking messages as read", error));

    scrollToBottom();

}

function scrollToBottom() {
    // Select the chat container
    const chatContainer = document.getElementById('chat-container');

    // Set the scroll position to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// socket

var receiver_id = null;
var count_data;

socket.on('connect', function () {
    console.log('Connected to Socket.IO server');
    // socket.emit('join');

    // updateStatus('Online');
});


socket.on('echo',function(data) {
    console.log(data,"this is data");
    console.log(u_id,"selected user id")
})
socket.on('disconnect', function () {
    console.log("Disconnected from Socket.IO server");
    // updateStatus('Offline');

});



// setInterval(()=>{
//     socket.emit('update_last_seen');
// },60000);

socket.on('message', function (data) {

    // console.log(count_data)
    if(receiver_id != null){
        appendMessageToChat(data);

    }
    console.log(user_id,"this is the message");
    console.log(data.sender,"bla bla bla")
    console.log(receiver_id,"bla bla bla")
    if(user_id != data.sender){
        console.log(Number(receiver_id),data.sender)
        if(Number(data.sender) != Number(receiver_id)){
            console.log(user_id,data.sender)
            count_data[data.sender] += 1;
            document.getElementById(data.sender).innerText = count_data[data.sender];
            messagecounter();

        }else{

            
    fetch(`/mark_messages_as_read`,{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
        },
        body:JSON.stringify({}),
    })

    .then(response => response.json())
    .then(data => {
        console.log('Messages marked as read:', data);
        // if(data.status == "success"){
        //     document.getElementsByClassName("counter_container").style.display=none;
        // }

        // document.getElementById(u_id).innerHTML = '0';
        document.getElementById(u_id).style.display = 'none'; 
        
    })
    .catch(error => console.error("Error marking messages as read", error));
        }
        
    }
    
    
    
    // markMessageAsRead();
    
});


// socket.on('update_counter', function(data) {
//     // Update counters for each user
//     messagecounter();
//     count=count_data
//     console.log("from update counter socket");
// });


document.addEventListener('DOMContentLoaded',function(){
    console.log("entered add event");
    socket.emit('join');
    messagecounter();
    
    
});

function sendMessage() {
    const msg = document.getElementById("usermessage").value;
    console.log(msg);

    if (msg.trim() !== "") {
        var currentTime = new Date().toISOString();
        socket.send({ 'receiver_id': receiver_id, 'content': msg, 'time': currentTime });
    }

    // Clear the message input after sending
    document.getElementById("usermessage").value = "";
}

function appendMessageToChat(message,isOldMessage) {
    console.log("entered")
    console.log(message,"this is from append msg");
    var chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
    
        var messageContainer = document.createElement('div');
        messageContainer.className = "row message-body";
        var messageType = message.sender == user_id ? 'my-message' : 'other-message';
        console.log("hello reached here")
        messageContainer.innerHTML = `
        <div class="col-sm-12 ${messageType == 'my-message'? 'message-main-sender' : 'message-main-receiver'}">
              <div class="${messageType == 'my-message'?'my-message':"other-message"}" >
                <div class="message-text" >
                        ${message.content}
                
                </div>
                <span class="message-time pull-right" id="messagetime">
                  ${message.time}
                </span>
              </div>
            </div>
        `;
        chatContainer.appendChild(messageContainer);

        // if (!isOldMessage) {
        //     chatContainer.scrollTop = chatContainer.scrollHeight;
        // }
    }
    
}

function loadPreviousMessage() {
    console.log("this is from loadprevous msg")
    if (receiver_id) {
        var chatContainer = document.getElementById('chat-container');
        if (chatContainer) {

            clearChatContainer();

            // Use an absolute URL for the fetch request
            fetch(`/get_messages/${receiver_id}`)
                .then(response => response.json())
                .then(data => {
                    console.log('Received data from server:', data); // Debugging line


                    if(data.last_seen === "Online"){
                        document.getElementById("status").innerHTML = data.last_seen;
                    }
                    else{
                        document.getElementById("status").innerHTML = "Last seen:"+data.last_seen;
                    }
                
                    // document.getElementById('status').innerText = data.last_seen
                    data.messages.forEach(msg => {
                        console.log(msg,"something")
                        appendMessageToChat(msg,true);

                        // message.counter=True;
                    });
                })
                .catch(error => console.error('Error fetching messages:', error));
        }
    }
}
function messagecounter() {
    console.log("entered msg counter function");
    fetch(`/set_count`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // document.getElementById('message_count').textContent = `Message Count: ${data.msg_count}`;
            //  updateMessageCount(data);
            count_data=data;
            
            for (key in count_data){
                if(count_data[key]==0){
                    console.log("entered innnn")
                    document.getElementById(key).style.display="none";
                }
                else{
                    document.getElementById(key).style.display="flex";
                }
            }
           

            for (userId in data){
                document.getElementById(userId).innerHTML=data[userId];
                
            }


            console.log('message_counter function executed successfully');
        })
        .catch(error => console.error("Error occurred", error));
}


// function markMessageAsRead(){
//     console.log('entered to mark message');
//     fetch(`/mark_messages_as_read`,{
//         method:'POST',
//         headers:{
//             'Content-Type':'application/json',
//         },
//         body:JSON.stringify({}),
//     })

//     .then(response => response.json())
//     .then(data => {
//         console.log('Messages marked as read:', data);
//         // if(data.status == "success"){
//         //     document.getElementsByClassName("counter_container").style.display=none;
//         // }

//         document.getElementById(u_id).innerHTML = '0';
//         document.getElementById(u_id).style.display = 'none'; 
        
//     })
//     .catch(error => console.error("Error marking messages as read", error));
// }

function clearChatContainer() {
    var chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.innerHTML = "";
    }
}

socket.on('connect', function () {
    console.log('Connected to Socket.IO server');
    // socket.emit('join');

    // updateStatus('Online');
});


socket.on('echo',function(data) {
    console.log(data,"this is data");
    console.log(receiver_id,"selected user id")

    if(data.user_id == receiver_id){
        document.getElementById('status').innerHTML=data.status;
    }
})
socket.on('disconnect', function (data) {
    console.log("Disconnected from Socket.IO server");
    if(data.user_id == receiver_id){
        document.getElementById('status').innerHTML="Last seen : "+data.status;
    }

});




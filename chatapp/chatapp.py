from flask import Flask,render_template,request,session,url_for,redirect,flash,request,jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash,check_password_hash
from flask_socketio import SocketIO, join_room, leave_room, send,emit,disconnect
from datetime import datetime

app = Flask(__name__)
app.secret_key="hello"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.sqlite3'
app.config['SQLALCHEMY_TRACK_MODIFICATION'] = False

db = SQLAlchemy(app)

#initialize flask-socketio
socketio = SocketIO(app)

# ,UserMixin
class users(db.Model):
    id=db.Column("id",db.Integer,primary_key=True)
    firstname=db.Column(db.String(100))
    lastname=db.Column(db.String(100))
    email=db.Column(db.String(100),nullable=False,unique=True)
    password=db.Column(db.String(20))
    status=db.Column(db.String(50))

    
    def __init__(self,firstname,lastname,email,password,status):
        self.firstname=firstname
        self.lastname=lastname
        self.email=email
        self.password=password
        self.status=status

    

class messages(db.Model):
    id=db.Column("id",db.Integer,primary_key=True)
    sender=db.Column(db.Integer)
    receiver=db.Column(db.Integer)
    content=db.Column(db.String(100),nullable=False)
    time=db.Column(db.DateTime,default=datetime.utcnow)
    counter=db.Column(db.Boolean,default=False)

    def __init__(self,sender,receiver,content,time,counter):
        self.sender=sender
        self.receiver=receiver
        self.content=content
        self.time=time
        self.counter=counter

rooms = {}

user_statuses = {}

@app.route('/',methods=["POST","GET"])
def login_user():
    if request.method == "POST":
        email = request.form['email']
        password = request.form['password']
        # print(email,passwordel)
        user = users.query.filter_by(email=email).first()
        if user and check_password_hash(user.password,password):
            flash('success')
            session['currentuser']=email
            session['user_id']=user.id

            if 'user_id' in session:
                curr_user = users.query.get(session['user_id'])
                if curr_user:
                    curr_user.status="Online"
                    db.session.commit()

            return redirect(url_for('home'))
        else:
            flash('error')
    return render_template("login.html")

@app.route("/home",methods=['GET','POST'])
# @login_required
def home():
    currentuser=session.get('currentuser')
    user_id=session['user_id']
    user=users.query.all()
    current=users.query.filter(users.email == currentuser).first()
    names=users.query.filter(users.email != currentuser).all()

    # last_seen_data = {i.id: i.last_seen.strftime('%Y-%m-%d %H:%M:%S') for i in names}
    # return render_template("home.html",names=names,user_id=user_id,user=user,last_seen_data=last_seen_data)    
    
    return render_template("home.html",names=names,user_id=user_id,user=user,current=current)




@socketio.on('message')
def send_message(data):
    sender = session['user_id']
    receiver = data['receiver_id']
    room_name_sender=f"user_{sender}"
    room_name_receiver=f"user_{receiver}"

    # user=users.query.get(sender)
    # user.update_last_seen()

    if 'content' in data:
        content = data['content']
        new_message = messages(sender=sender, receiver=receiver, content=content,time=datetime.now(),counter=False)
        db.session.add(new_message)
        db.session.commit()

        send({"content":content,"sender":sender,"rec":str(receiver),"time":new_message.time.isoformat(),"counter":False},room=room_name_sender)
        send({"content":content,"sender":sender,"rec":str(receiver),"time":new_message.time.isoformat(),"counter":False},room=room_name_receiver)
        print(f"sent message to rooms : {room_name_sender} and {room_name_receiver}  message :{content}")


        # mark_messages_as_read(sender,receiver)
    # send({"":content},to=receiver)

# @socketio.on('update_last_seen')
# def update_last_seen():
#     user_id = session.get('user_id')
#     if user_id is not None:
#         user=users.query.get(user_id)
#         user.update_last_seen()

    
@socketio.on('join')
def handle_join():
    user_id = session.get('user_id')
    if user_id is None:
        return
   
    room_name_sender = f"user_{user_id}"
    
    join_room(room_name_sender)
    print(user_id,"loger")
    emit('echo', {"user_id" : user_id,"status" : "Online"},  broadcast=True)
    


@socketio.on('disconnect')
def handle_disconnect():
    user_id=session.get('user_id')
    emit('disconnect', {"user_id" : user_id,"status" : str(datetime.now().strftime('%H:%M:%S %Y-%m-%d '))},  broadcast=True)


@app.route('/get_messages/<int:receiver_id>')
def get_messages(receiver_id):
    user_id = session.get('user_id')
    reciever_user = users.query.get(receiver_id)
    # if not reciever_user:
    #     raise
    if user_id:
        message = messages.query.filter(((messages.sender == user_id)& (messages.receiver == receiver_id)) | ((messages.sender == receiver_id) & (messages.receiver == user_id))).order_by(messages.time).all()

        messages_data = [
            {'content':msg.content,'sender':msg.sender,'time':msg.time} for msg in message
        ]
        return jsonify({'messages' : messages_data,"last_seen":reciever_user.status})
    else: 
        return jsonify({'error':'user not logged in '})
    
@app.route('/set_count')
def set_counter():
    user_id=session.get('user_id')
    msg_count={}
    other_users=users.query.filter(users.id != user_id).all()
    for filter_user in other_users:
        unread_msg = messages.query.filter(messages.sender.in_([filter_user.id]),
                                           messages.receiver.in_([user_id]),
                                           messages.counter == False).count()
        msg_count[filter_user.id] = unread_msg
    
    return jsonify(msg_count)

# @app.route('live')
# def live_chatting():
#     sender=messages.sender
#     receiver=messages.receiver

@app.route('/mark_messages_as_read',methods=['POST'])
def mark_messages_as_read():
    print("mark message as read")
    user_id = session.get('user_id')

    messages.query.filter_by(receiver = user_id,counter=False).update({'counter':True})
    db.session.commit()
    # messages.query.filter(
    #     ((messages.sender == sender) & (messages.receiver == receiver)) |
    #     ((messages.sender == receiver) & (messages.receiver == sender)),
    #     messages.counter == False
    # ).update({'counter': True})
    # db.session.commit()

    
    return jsonify({'status':'success'})


@app.route("/register",methods=["POST","GET"])
def register():
    

    if request.method == "POST":
        firstname=request.form['firstname']
        lastname=request.form['lastname']
        email=request.form['email']
        password = request.form['password']

        hashed_password = generate_password_hash(password)

        if not email:
           flash("Enter values")
           return redirect(url_for('register'))

        user = users(firstname,lastname,email,hashed_password,status=None)
        db.session.add(user)
        db.session.commit()

        flash("Registered Successfully")
        return redirect(url_for("login_user"))
        

    return render_template("register.html")

@app.route("/logout")
def logout():

    if 'user_id' in session:
                curr_user = users.query.get(session['user_id'])
                if curr_user:
                    curr_user.status=datetime.utcnow().strftime('%H:%M:%S %Y-%m-%d ')
                    db.session.commit()


    session.pop('currentuser',None)
    session.pop('user_id',None)

    # user_id=session.pop('user_id',None)
    # if user_id is not None:
    #     room_name=f"user_{user_id}"
    #     leave_room(room_name)
    #     socketio.server.disconnect(request.sid, namespace='/')

    flash('You have been logged out Successfully','success')
    return redirect(url_for('login_user'))

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    socketio.run(app,debug=True) 

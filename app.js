var methodOverride = require('method-override'),
    LocalStrategy  = require('passport-local'),
    bodyParser     = require('body-parser'),
    cookieParser   = require('cookie-parser'),
    flash          = require('connect-flash'),
    passport       = require('passport'),
    mongoose       = require('mongoose'),
    express        = require('express'),
    keys = require('./keys');

// Mongo Models/Schemas
var Question = require('./models/question'),
    Attempt  = require('./models/attempt'),
    Quiz     = require('./models/quiz'),
    User     = require('./models/user');

// mongoose.connect(keys.mongoUrl);
mongoose.connect("mongodb://localhost/quiz_app");


var port = 3001;
var app = express();

// ------------------------------
// App Config
// ------------------------------
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(flash());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method'));

// ------------------------------
// Passport Config
// ------------------------------
app.use(require('express-session')({
  secret: 'damn i dont know what i be doing',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// ------------------------------
// Random Routes
// ------------------------------

app.get('/q', function(req, res) {
  res.render('landing');
});

app.get('/q/register', function(req, res) {
  res.render('register');
});

app.post('/q/register', function(req, res) {
  var newUser = new User({username: req.body.username});

  User.register(newUser, req.body.password,
    function(error, user) {
      if(error) {
        req.flash('error', error.message);
        res.redirect('/register');
        console.log(error);
      } else {
        passport.authenticate('local')(req, res, function() {
          if(req.cookies.qid) {
            url = `/q/quizzes/${req.cookies.qid}/attempts/new`;
          } else {
            url = '/q/quizzes';
          }
          res.clearCookie('qid');
          req.flash('success', 'Welcome! Thanks for registering.');
          res.redirect(url);
      });
      }
  });
});

app.get('/q/login', function (req, res) {
  if(req.cookies.qid) {
    res.cookie.qid = req.cookies.qid
  }
  res.render('login');
});

app.post('/q/login',
  function(req, res, next) {
    if(req.cookies.qid) {
      url = `/q/quizzes/${req.cookies.qid}/attempts/new`;
    } else {
      url = '/q/quizzes';
    }
    console.log('URL: ' + url);
    next();
  },
  function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      console.log(info)
      if (err) {
        console.log(err)
        req.flash('error', 'Oops. Something went wrong on our side.');
        res.redirect('/q/login');
      }

      if (!user) {
        req.flash('error', info.message);
        return res.redirect('/q/login');
      }

      req.logIn(user, function(err) {
        if (err) {
          console.log(err);
          req.flash('error', 'Oops. Something went wrong on our side.');
          return res.redirect('/q/login');
        }
        req.flash('success', "You're logged in.");
        return res.redirect('/q/quizzes');
      });
  })(req, res, next);
});

app.get('/q/logout', function(req, res) {
  req.logout();
  req.flash('error', "You've been logged out.");
  res.redirect('/q');
});

// ------------------------------
// Quizzes Routes
// ------------------------------
app.get('/q/quizzes', isLoggedIn, function(req, res) {
  // find all quizzes
  Quiz.find({"author.id":req.user._id})
    .populate('attempts')
    .exec()
    .then(function(allQuizzes) {
      res.render('quizzes', {quizzes: allQuizzes});
    })
    .catch(function(err) {
      req.flash('error', "Oops. Couldn't find your Quizzes.");
      res.redirect('/q');
      console.log(err);
    });
});

app.get('/q/quizzes/new', isLoggedIn, function(req, res) {
  res.render('new-quiz');
});

app.post('/q/quizzes', isLoggedIn, function(req, res) {
  var newQuiz = {
    questions: [],
    author: {},
    date: new Date(),
    name: req.body.name
  }

  var questionA = {
    type: 'blank',
    answer: req.body.blank.answer,
    text: req.body.blank.text
  }

  var questionB = {
    type: 'tf',
    answer: req.body.tf.answer,
    text: req.body.tf.text
  }

  var questionC = {
    type: 'mc',
    answer: req.body.mc.answer,
    options: []
  }

  var mc = req.body.mc;
  questionC.text = mc.text;
  questionC.answer = mc.answer;
  questionC.options.push(mc.option1);
  questionC.options.push(mc.option2);
  questionC.options.push(mc.option3);

  newQuiz.author.id = req.user._id
  newQuiz.author.username = req.user.username

  Quiz.create(newQuiz, function(err, quiz) {
    if(err) {
      console.log(err);
    } else {
      Question.create(questionA, function(err, q1) {
        if(err) {
          console.log(err);
        } else {
          q1.save();
          Question.create(questionB, function(err, q2) {
            if(err) {
              console.log(err);
            } else {
              q2.save();
              Question.create(questionC, function(err, q3) {
                if(err) {
                  console.log(err);
                } else {
                  q3.save();
                  quiz.questions.push(q1._id);
                  quiz.questions.push(q2._id);
                  quiz.questions.push(q3._id);
                  quiz.save();
                  res.redirect('/q/quizzes');
                }
              });
            }
          });
        }
      });
    }
  });
});

app.get('/q/quizzes/:id', checkQuizOwnership, function(req, res) {
  var id = req.params.id;

  Quiz.findById(id)
    .populate('attempts')
    .populate('questions')
    .exec()
    .then(function(foundQuiz) {
      if(!foundQuiz) {
        req.flash('error', "Oops. Something went wrong on our end.");
        return res.redirect('/q/quizzes');
      }
      res.render('show', {quiz: foundQuiz});
    })
    .catch(function(err) {
      console.log(err);
      req.flash('error', "Oops. Couldn't find that Quiz.");
      res.redirect('/q/quizzes');
    });
});

app.get('/quizzes/:id/edit', checkQuizOwnership, function(req, res) {
  var id = req.params.id;

  Quiz.findById(id)
    .populate('questions')
    .exec()
    .then(function(foundQuiz) {
      if(!foundQuiz) {
        req.flash('error', "Oops. Something went wrong on our end.");
        return res.redirect('/q/quizzes');
      }
      res.render('edit', {quiz: foundQuiz});
    })
    .catch(function(error) {
      console.log(err);
      req.flash('error', "Oops. Couldn't find that Quiz.");
      res.redirect(`/q/quizzes`);
    });
});

app.put('/q/quizzes/:id', checkQuizOwnership, function(req, res) {

  var questionA = {
    type: 'blank',
    answer: req.body.blank.answer,
    text: req.body.blank.text
  }

  var questionB = {
    type: 'tf',
    answer: req.body.tf.answer,
    text: req.body.tf.text
  }

  var questionC = {
    type: 'mc',
    answer: req.body.mc.answer,
    options: []
  }

  var mc = req.body.mc;
  questionC.text = mc.text;
  questionC.answer = mc.answer;
  questionC.options.push(mc.option1);
  questionC.options.push(mc.option2);
  questionC.options.push(mc.option3);

  Quiz.findByIdAndUpdate(req.params.id, {name: req.body.name}, function(err, updatedQuiz) {
    if(err) {
      console.log(err);
    }
  });

  Question.findByIdAndUpdate(req.body.blank.id, questionA, function(err, updatedQuestion) {
    if(err) {
      console.log(err)
    } 
  });

  Question.findByIdAndUpdate(req.body.tf.id, questionB, function(err, updatedQuestion) {
    if(err) {
      console.log(err)
    } 
  });

  Question.findByIdAndUpdate(req.body.mc.id, questionC, function(err, updatedQuestion) {
    if(err) {
      console.log(err)
    } 
  });
  res.redirect('/q/quizzes');
});

app.delete('/q/quizzes/:id', checkQuizOwnership, function(req, res) {
  var id = req.params.id;
  Quiz.findById(id)
  .then(function(foundQuiz) {
    if(!foundQuiz) {
      req.flash('error', "Oops. Something went wrong on our end.");
      return res.redirect('/q/quizzes');
    }

    foundQuiz.questions.forEach(function(id) {
      Question.findByIdAndRemove(id, function(err) {
        if(err) {
          console.log(err);
        }
      });
    });

    foundQuiz.attempts.forEach(function(id) {
      Attempt.findByIdAndRemove(id, function(err) {
        if(err) {
          console.log(err);
        }
      });
    });

    Quiz.findByIdAndRemove(id, function(err) {
      if(err) {
        console.log(err);
        res.redirect('/quizzes');
      } else {
        res.redirect('/quizzes');
      }
    });
    // res.render('edit', {quiz: foundQuiz});
  })
  .catch(function(error) {
    req.flash('error', "Oops. Couldn't find that Quiz.");
    res.redirect('/q/quizzes');
    console.log(err);
  });
});

// ------------------------------
// Attempts Routes
// ------------------------------

app.get('/q/quizzes/:id/attempts/welcome', isLoggedIn, function(req, res) {
  res.render('welcome', {id: req.params.id});
});

app.get('/q/quizzes/:id/attempts/new', isLoggedIn, function(req, res) {
  var qid = req.params.id;
  Quiz.findById(qid)
  .populate('questions')
  .exec()
  .then(function(foundQuiz) {
    if(!foundQuiz) {
      req.flash('error', "Oops. Something went wrong on our end.");
      return res.redirect('/q/quizzes');
    }
    res.render('quiz', {quiz: foundQuiz});
  })
  .catch(function(err) {
    req.flash('error', "Oops. Something went wrong on our end.");
    res.redirect('/q/quizzes');
    console.log(err);
  });
});

app.post('/quizzes/:id/attempts/result', isLoggedIn, function(req, res) {
  var data = req.body.attempt;
  var newAttempt = {
    answers: [],
    score: 0,
    author: {
      id: req.user._id,
      username: req.user.username
    }
  };
  newAttempt.answers.push(data.blank);
  newAttempt.answers.push(data.tf);
  newAttempt.answers.push(data.mc);
  // find quiz
  Quiz.findById(req.params.id).populate("questions").exec()
    .then(function(foundQuiz) {
      if(!foundQuiz) {
        req.flash('error', "Oops. Something went wrong on our end.");
        return res.redirect('/q/quizzes');
      }
      // go through questions arr
      for(var i = 0; i < foundQuiz.questions.length; i++) {
        if(newAttempt.answers[i] === foundQuiz.questions[i].answer) {
          newAttempt.score++;
        }
      }
      Attempt.create(newAttempt, function(err, attempt) {
        if(err) {
          console.log(err);
        } else {
          foundQuiz.attempts.push(attempt._id);
          foundQuiz.save();
          res.render('attempt', {score: attempt.score});
        }
      });
    })
    .catch(function(err) {
      req.flash('error', "Oops. Something went wrong on our end.");
      res.redirect(`/q/quizzes`);
      console.log(err);
    });
});

function isLoggedIn(req, res, next) {
  
  if(req.isAuthenticated()) {
    next();
  } else {
    if(req.params.id) {
      res.cookie('qid', req.params.id);
    }
    req.flash('error', 'You need to be logged in to do that.');
    res.redirect('/q/login');
    console.log("You need to be logged in to do that.");
  }
}


function checkQuizOwnership(req, res, next) {
  if(req.isAuthenticated()) {
    Quiz.findById(req.params.id, function(err, foundQuiz) {
      if(err || !foundQuiz) {
        req.flash('error', 'Sorry. There was an error on our end.');
        res.redirect('back');
        console.log(err);
      } else {
        if(foundQuiz.author.id.equals(req.user._id)) {
          next();
        } else {
          req.flash('error', "You don't have permission to do that.");
          res.redirect('back');
        }
      }
    });
  } else {
    req.flash('error', "You need to be logged in to do that.");
    res.redirect('back') ;
  }
}

app.listen(port, function() {
  console.log('QuizApp - Listening on port ' + port);
});
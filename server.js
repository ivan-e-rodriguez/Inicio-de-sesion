import express from "express"
import { engine as exphbs } from "express-handlebars"
import session from "express-session"
import MongoStore from "connect-mongo"
import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import mongoose from "mongoose"
import * as models from "./models/usuario.js"

//-------------------------------------------------------------------------

const URL = "mongodb+srv://user:pass@database.bt5jqpv.mongodb.net/?retryWrites=true&w=majority"

const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true }

try {
    await mongoose.connect( URL, advancedOptions )
} catch (error) {
    console.log(error);
}

const usuarios = await models.usuario.find()


//-------------------------------------------------------------------------

passport.use('register', new LocalStrategy({
    passReqToCallback: true
}, (req, username, password, done) => {

    const usuario = usuarios.find(usuario => usuario.email == username)
    if (usuario) {
        return done('el usuario ya esta registrado')
    }

    const newUser = new models.usuario({
        email: username,
        password: password
    })

    newUser.save()


    done(null, newUser)
}))

passport.use('login', new LocalStrategy((username, password, done) => {

    const usuario = usuarios.find(usuario => usuario.email == username)

    if (!usuario) {
        return done('no hay usuario', false)
    }

    if (usuario.password != password) {
        return done('pass incorrecta', false)
    }

    usuario.contador = 0

    return done(null, usuario)
}))

passport.serializeUser((user, done) => { 

    done(null, user.email)
})

passport.deserializeUser( async (username, done) => {

    const usuario = await usuarios.find(usuario => usuario.email == username)
    
    done(null, usuario)
})



//-------------------------------------------------------------------------

const app = express()

app.use(session({
    store: MongoStore.create({
        mongoUrl: URL,
        mongoOptions: advancedOptions,

    }),
    cookie: { maxAge: 600000},
    secret: "misecreto",
    resave: false,
    saveUninitalized: false
}))

app.use(passport.initialize())
app.use(passport.session())



//----------------------------------------------------------------------

app.engine('.hbs', exphbs({ extname: '.hbs', defaultLayout: "./main.hbs" }))

app.set('view engine', '.hbs')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

//----------------------------------------------------------------------

function requireAuthentication(req, res, next) {
    if (req.isAuthenticated()) {
        next()
    } else {
        res.redirect('/login')
    }

}

//-------------------------------RUTAS----------------------------------

//LOGIN

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/datos')
    }
    res.render('login.hbs')
})

app.post('/login', passport.authenticate('login', { failureRedirect: '/loginfail', successRedirect: '/datos' }))


app.get('/loginfail', (req, res) => {
    res.render('login-error.hbs')
})


//REGISTER


app.get('/register', (req, res) => {
    res.render('register.hbs')
})

app.post('/register', passport.authenticate('register', { failureRedirect: '/failregister', successRedirect: '/' }))

app.get('/failregister', (req, res) => {
    res.render('register-error.hbs')
})


//DATOS


app.get('/datos', requireAuthentication, async (req, res) => {
    const usuario = await usuarios.find(usuario => usuario.email == req.user.username)
    console.log(usuario);

    res.render('datos.hbs', {email: usuario.email})
})

app.get('/logout', (req, res) => {
    const usuario = usuarios.find(usuario => usuario.email == req.user.username)
    req.session.destroy()
    res.render('logout.hbs', {email: usuario.email})
})



//---------------------------------------------------------------------

const PORT = 8080

app.listen(PORT, () => {
    console.log("Escuchando 8080");
})

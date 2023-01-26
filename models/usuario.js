import mongoose from "mongoose";

const usuariosCollection = "usuarios"

const UsuariosSchema = new mongoose.Schema({
    email: String,
    password: String
})

export const usuario = mongoose.model(usuariosCollection, UsuariosSchema)
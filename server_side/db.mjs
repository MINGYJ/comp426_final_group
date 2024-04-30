import {Database} from 'sqlite-async';

// Your code to set up a database goes here.

export let db = await Database.open('db.sqlite');

export async function start(db){
    // await db.run('DROP TABLE IF EXISTS users');
    await db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password,cal INTEGER)');
    // await db.run('DROP TABLE IF EXISTS Exercise');
    await db.run('CREATE TABLE IF NOT EXISTS Exercise (id INTEGER PRIMARY KEY,name STRING NOT NULL,type STRING NOT NULL,burned STRING NOT NULL,username STRING)')
}
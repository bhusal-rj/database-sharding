const app = require("express")()
const Client = require("pg").Client
const ConsitentHash = require("consistent-hash")
const crypto = require("crypto")
const hr = new ConsitentHash()
hr.add("5438")
hr.add("5437")
hr.add("5436")

const postgresConfig = {
  host: "localhost",
  user: "postgres",
  password: "demo",
  database: "url",
  idleTimeoutMillis: 3000000,
}

function createClients() {
  return {
    "5438": new Client({ ...postgresConfig, port: 5438 }),
    "5437": new Client({ ...postgresConfig, port: 5437 }),
    "5436": new Client({ ...postgresConfig, port: 5436 }),
  };
}

let clients = createClients();
let connectionCount=0;
async function connect() {
  try {
    await Promise.all([
      clients['5438'].connect(),
      clients['5437'].connect(),
      clients['5436'].connect(),
    ])
  } catch (err) {
    if (connectionCount == 10){
      console.log("Max retires reached")
      process.exit(1)
    }
    console.log(err)
    clients=createClients()
    connectionCount++;
    //wait for 5 seconds
    await new Promise(resolve=>setTimeout(()=>resolve("ok"),5000))
    connect()
  }
}
connect()
app.get("/", (req, res) => {

})

app.post("/", async(req, res) => {
  try{
    
const url = req.query.url;
  //consistently hash to get a port
  const hash = crypto.createHash("sha256").update(url).digest("base64")
  const urlId=hash.substring(0,5);

  const server=hr.get(urlId)
  await clients[server].query("INSERT INTO URL_TABLE (URL,URL_ID) VALUES ($1,$2)",[url,urlId])
  res.send({
    "urlId": urlId,
    "url":url,
    "server":server
  })
  }catch(err){
    console.log(err)
    res.send("There has been an error")
  }
  
})

app.listen("8020", () => {
  console.log("Server is listening at port 8020")
})

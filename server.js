var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
var {MD5} = require("crypto-js");
var connection = mysql.createConnection({
  host: '35.225.170.73',
  user: 'root',
  password: 'team-031',
  database: 'flight031'
});

// establish the connection
connection.connect;

// initiallize the app
var app = express();

// set up ejs view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


let Role = 'Admin';

// GET login page, respond by rendering index.ejs
app.get('/', function(req, res) {
  res.render('login', { title: 'Flight031', alert: null });
});

app.get('/login', function(req, res) {
  res.render('login', { title: 'Flight031', alert: null });
});

app.get('/logout', function(req, res) {
  res.render('login', { title: 'Flight031', alert: null });
});

// GET signup pages, respond by rendering signup.ejs
app.get('/signup', function(req, res) {
  res.render('signup', { title: 'Flight031-Sign-Up', alert: null })
});


// GET main page, respond by rendering home.ejs
app.get('/home', function(req, res) {
  res.render('home', { Role: Role });
});

// POST to sign up, check user's existence and other restrictions
app.post('/signup', function(req, res){
    var username = req.body.user_name;

    // hash the password to store into the database instead of the plaintext
    var password = MD5(req.body.password).toString();
    var confirmPassword = MD5(req.body.confirm_password).toString();
    var reqs = JSON.stringify(req.body);
    if (password != confirmPassword) {
      return res.render('signup', { title: 'Flight031', alert: `Passwords do not match` });
    }
  
    // check whether the username is exist
    var check_sql = `SELECT COUNT(*) FROM user WHERE name = '${username}'`;
    connection.query(check_sql, function(err, result){
      if (err) {
        res.send(err)
        return;
      }
      if (result[0]['COUNT(*)'] > 0){
        return res.render('signup', { title: 'Flight031', alert: `The user with the same username is already existed!` });
      }
    })
    
    // store the username and password to the database
    var sql = `INSERT INTO user (name, password) VALUES('${username}', '${password}')`;
    connection.query(sql, function(err, result) {
      if (err) {
        res.send(err)
        return;
      }
      res.render('login', {title: 'Flight031', alert: "Sign up successful, please login to the system"});
    });
})

// POST to login, check the existence of user and the correctness of the password
app.post('/login', function(req, res){
  // get user name from the request
  var username = req.body.user_name;

  // hash the password to store into the database instead of the plaintext
  var password = MD5(req.body.password).toString();

  // query the user with the same user name
  var login = `SELECT password FROM user WHERE name = '${username}'`
  connection.query(login, function(err, result){
    if (err) {
      res.send(err)
      return;
    }
    // if no result -> no user called ${username}
    if(result.count == 0){
      res.render('login', {title: 'Flight031', alert: `No user called ${username}, please try another name`});
    }
    // if password md5 is not the same -> wrong password
    if(password !== result[0]['password']){
      res.render('login', {title: 'Flight031', alert: `Wrong password for user ${username}, please try again`});
    }
    // login success, redirect to the main page
    res.render('home', { Role: Role});
  })
})

// serach flight
app.get('/searchFlights', function(req, res) {
  // parse query
  var searchingConditions = req.query;
  var year = searchingConditions.year;
  var month = searchingConditions.month;
  var day = searchingConditions.day;
  var plannedDepartureTime = searchingConditions.plannedDepartureTime;
  var tailNumber = searchingConditions.tailNumber;
  var airline = searchingConditions.airline;
  var originAirport =searchingConditions.originAirport;
  var destinationAirport = searchingConditions.destinationAirport;

  // console the searching condition
  console.log("searching for flights with these conditions:\n[year, month, day, plannedDepartureTime, tailNumber, airline, originAirport, destinationAirport]\n[" + 
  [year, month, day, plannedDepartureTime, tailNumber, airline, originAirport, destinationAirport].join(',') + "]");
  
  // generate the sql
  let queryParams = [];
  let whereClause = "WHERE 1 = 1";
  if (year) {
    whereClause += " AND Year = ?";
    queryParams.push(year);
  }

  if (month) {
    whereClause += " AND Month = ?";
    queryParams.push(month);
  }

  if (day) {
    whereClause += " AND Day = ?";
    queryParams.push(day);
  }

  if (plannedDepartureTime) {
    whereClause += " AND PlannedDepartureTime = ?";
    queryParams.push(plannedDepartureTime);
  }

  if (tailNumber) {
    whereClause += " AND TailNumber = ?";
    queryParams.push(tailNumber);
  }

  if (airline) {
    whereClause += " AND Airline = ?";
    queryParams.push(airline);
  }

  if(originAirport) {
    whereClause += " AND OriginAirport = ?";
    queryParams.push(originAirport);
  }

  if (destinationAirport) {
    whereClause += " AND DestinationAirport = ?";
    queryParams.push(destinationAirport);
  }
  let search_sql = "SELECT * FROM flight " + whereClause;
  connection.query(search_sql, queryParams, function(err, results1){
    if (err) {
      console.log(err);
      return res.status(500).send("Error retrieving flights");
    }
    let airport_sql = `SELECT * FROM airport WHERE IATA_CODE IN (SELECT OriginAirport FROM flight ` + whereClause + `) ORDER BY DelayedFlightAmount DESC;`;
    connection.query(airport_sql, queryParams, function(err, results2){
      if (err) {
        console.log(err);
        return res.status(500).send("Error retrieving airports");
      }
      res.render('search', { flights: results1, airports: results2, Role: Role, year: year, month: month, day: day, tailNumber: tailNumber, airline: airline, originAirport: originAirport, destinationAirport: destinationAirport, plannedDepartureTime: plannedDepartureTime });
    })
  })
})

// delete flight
app.post('/deleteFlights', function(req, res) {
  var selectedFlights = req.body;
  if (!Array.isArray(selectedFlights)) {
    selectedFlights = [selectedFlights];
  }
  console.log("console log req.body"+JSON.stringify(req.body));
  var delete_sql = `DELETE FROM flight WHERE Year=? AND Month=? AND Day=? AND TailNumber=? AND PlannedDepartureTime=?`
  for (let i = 0; i < selectedFlights.length; i++) {
    [year, month, day, tailNumber, plannedDepartureTime] = selectedFlights[i].split('|');
    connection.query(delete_sql, [year, month, day, tailNumber, plannedDepartureTime], function(err, results){
      if (err) {
        console.log(err);
        return res.status(500).send("Error retrieving flights");
      }
    })
    console.log("deleted: [" + [year, month, day, tailNumber, plannedDepartureTime].join(',') + ']');
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end();
  console.log("finish");
});

// insert a flight
app.post("/insertFlight", function(req, res){
  var data = req.body;
  var year = typeof data.year !== 'undefined' ? data.year : '';
  var month = typeof data.month !== 'undefined' ? data.month : '';
  var day = typeof data.day !== 'undefined' ? data.day : '';
  var plannedDepartureTime = typeof data.plannedDepartureTime !== 'undefined' ? data.plannedDepartureTime : '';
  var tailNumber = typeof data.tailNumber !== 'undefined' ? data.tailNumber : '';
  var dayOfWeek = typeof data.dayOfWeek !== 'undefined' ? data.dayOfWeek : '';
  var airline = typeof data.airline !== 'undefined' ? data.airline : '';
  var originAirport = typeof data.originAirport !== 'undefined' ? data.originAirport : '';
  var destinationAirport = typeof data.destinationAirport !== 'undefined' ? data.destinationAirport : '';
  var queryParams = [year, month, day, tailNumber, plannedDepartureTime, dayOfWeek, airline, originAirport, destinationAirport];
  console.log("inserting: [" + queryParams.join(',') + ']');

  var insert_sql = `INSERT INTO flight (Year, Month, Day, TailNumber, PlannedDepartureTime, DayOfWeek, Airline, OriginAirport, DestinationAirport) 
  VALUES (?,?,?,?,?,?,?,?,?)`;

  connection.query(insert_sql, queryParams, function(err, results){
    if (err) {
      console.log(err);
      res.status(500).json({ error_message: "Insert failed! " + err});
      res.send();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write("insert successful!");
    res.end();
  })
});

// update the flight
app.post("/updateFlight", function(req, res){
  var data = req.body;
  // parse information from body
  var id = typeof data.id !== 'undefined' ? data.id: '';
  var year = typeof data.year !== 'undefined' ? data.year : '';
  var month = typeof data.month !== 'undefined' ? data.month : '';
  var day = typeof data.day !== 'undefined' ? data.day : '';
  var plannedDepartureTime = typeof data.plannedDepartureTime !== 'undefined' ? data.plannedDepartureTime : '';
  var tailNumber = typeof data.tailNumber !== 'undefined' ? data.tailNumber : '';
  var dayOfWeek = typeof data.dayOfWeek !== 'undefined' ? data.dayOfWeek : '';
  var airline = typeof data.airline !== 'undefined' ? data.airline : '';
  var originAirport = typeof data.originAirport !== 'undefined' ? data.originAirport : '';
  var destinationAirport = typeof data.destinationAirport !== 'undefined' ? data.destinationAirport : '';
  var queryParams = [year, month, day, tailNumber, plannedDepartureTime, dayOfWeek, airline, originAirport, destinationAirport];
  console.log("updating " + id + ""+ " to [" + queryParams.join(',') + ']');

  // parse information from id
  [_year, _month, _day, _tailNumber, _plannedDepartureTime] = id.split('|');

  // update query
  var update_sql = `UPDATE flight 
  SET Year = ${year}, Month = ${month}, Day = ${day}, TailNumber = '${tailNumber}', 
  PlannedDepartureTime = '${plannedDepartureTime}', DayOfWeek = ${dayOfWeek},
  Airline = '${airline}', OriginAirport = '${originAirport}', DestinationAirport = '${destinationAirport}'
  WHERE Year = ${_year} AND Month = ${_month} AND Day = ${_day} AND TailNumber = '${_tailNumber}' AND PlannedDepartureTime = '${_plannedDepartureTime}'`
  connection.query(update_sql, function(err, results){
    if (err) {
      console.log(err);
      connection.query(
        `SELECT * 
        FROM flight
        WHERE ${_year} AND Month = ${_month} AND Day = ${_day} AND TailNumber = '${_tailNumber}' AND PlannedDepartureTime = '${_plannedDepartureTime}'`
      , function(error, result){
        if(error){
          console.log(error);
        }
        res.status(500).json({ error_message: "Insert failed! " + err, origin_info: result[0]});
        res.send();
        return;
      });
      return; //res.status(500, { 'Content-Type': 'application/json' }).json().send();
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write("update successful!");
    res.end();
  });
});

// advanced search page
app.get('/advancedSearch', function(req, res) {
  res.render('advancedSearch', {Role: Role});
});

// Cities with most departures
app.get('/mostDepartureCities', function(req,res){
  // parse query
  var searchingConditions = req.query;
  var month = searchingConditions.month;
  var queryParams = [month];
  var cities_sql = 
  `SELECT c.Name, COUNT(*) AS Departures 
  FROM flight f JOIN airport a ON f.OriginAirport = a.IATA_CODE JOIN city c ON a.City = c.Name 
  WHERE f.Month = ${month}
  GROUP BY c.Name
  ORDER BY Departures DESC
  LIMIT 15;`
  connection.query(cities_sql, queryParams, function(err, results){
    if (err) {
      console.log(err);
      res.status(500).json({ error_message: err});
      res.send();
      return; 
    }
    return res.status(200).json({ results: results});
  })
});

// get canceled times
app.get('/getCanceledTimes', function(req,res){
  // parse query
  var searchingConditions = req.query;
  var month = searchingConditions.month;
  var originAirport = searchingConditions.originAirport;
  var queryParams = [month, originAirport];
  var canceledTime_sql =
  `SELECT a.Name AS Airport, f.PlannedDepartureTime AS PlannedDepartureTime, f.Month AS Month, COUNT(*) AS CountOfDelayedOrCancelledFlight
  FROM flight f JOIN airport a ON f.OriginAirport = a.IATA_CODE `;
  if(originAirport){
    canceledTime_sql += `WHERE a.IATA_CODE = '${originAirport}'`;
  }
  canceledTime_sql += ` GROUP BY a.Name, f.PlannedDepartureTime, f.Month `;
  if(month){
    canceledTime_sql += `HAVING f.Month = ${month}`;
  }
  canceledTime_sql += ` ORDER BY CountOfDelayedOrCancelledFlight DESC, Month LIMIT 15;`
  console.log(canceledTime_sql);
  connection.query(canceledTime_sql, queryParams, function(err, results){
    if (err) {
      console.log(err);
      res.status(500).json({ error_message: err});
      res.send();
      return; 
    }
    return res.status(200).json({ results: results});
  })
});


app.get('/getAllAirportNames',function(req,res){
  var allAirportNames_sql =
  `SELECT Name FROM airport`;
  connection.query(allAirportNames_sql, function(err, results){
    if (err) {
      console.log(err);
      res.status(500).json({ error_message: err});
      res.send();
      return; 
    }
    airports=[]
    for(let i in results){
      airports.push(results[i].Name)
    }
    return res.status(200).json({ results: airports });
  })
})

app.get('/getFlightsByAirportName',function(req,res){
  // get all flights by airport name through calling the stored procedure
  var originAirport = req.query.airportName;
  var direction = req.query.direction;
  var stored_procudure_sql = "CALL GetFlightDetailsByAirport(?,?);";
  connection.query(stored_procudure_sql, [originAirport, direction], function(err, results){
    if (err) {
      console.log(err);
      res.status(500).json({ error_message: err});
      res.send();
      return; 
    }
    return res.status(200).json({ results: results[0] });
  });
})

// start the server
app.listen(80, function () {
    console.log('Node app is running on port 80');
});


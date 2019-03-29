const express = require("express");
const { closestIndexTo, format, addHours } = require("date-fns");
const app = express();
const bodyParser = require("body-parser");
const config = require("config");

const applicationToken = process.env.APPLICATION_TOKEN;
const applicationTeamId = process.env.APPLICATION_TEAM_ID;

const events = config.get("events");

const mapEvent = event => ({
  name: event.name,
  startTime: format(addHours(event.startTime, 2), "HH.mm"),
  endTime: format(addHours(event.endTime, 2), "HH.mm")
});

const getCurrentEvent = () => {
  const idx = closestIndexTo(Date.now(), events.map(e => e.startTime));
  const event = events[idx];
  if (event) {
    const { name, startTime, endTime } = mapEvent(event);
    return `${name} (${startTime} - ${endTime})`;
  }
  return null;
};
const getNextEvent = () => {
  const idx = closestIndexTo(Date.now(), events.map(e => e.startTime));
  const event = events[idx + 1];
  if (event) {
    const { name, startTime, endTime } = mapEvent(event);
    return `${name} (${startTime} - ${endTime})`;
  }
  return null;
};

let validateRequest = function({ token, team_id } = {}) {
  if (!token || !team_id) {
    return false;
  }
  return token === applicationToken && team_id === applicationTeamId;
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// authentication middleware
app.use((req, res, next) => {
  console.log(req.body);
  if (validateRequest(req.body)) {
    return next();
  }
  return res.status(403).json({ error: "Unauthorized request" });
});

app.post("/", (req, res) => {
  res.json({
    response_type: "in_channel",
    text: `Nyt menossa: ${getCurrentEvent()}\nSeuraava tapahtuma: ${getNextEvent()}`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Eventholler is now running on port ${PORT}!`);
});

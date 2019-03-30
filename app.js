const express = require("express");
const { closestIndexTo, format, addHours, isWithinRange } = require("date-fns");
const app = express();
const bodyParser = require("body-parser");
const config = require("config");

const applicationToken = process.env.APPLICATION_TOKEN;
const applicationTeamId = process.env.APPLICATION_TEAM_ID;
const allowedUsers = (process.env.ALLOWED_USERS || []).split(",");

const events = config.get("events");

const mapEvent = event => ({
  name: event.name,
  startTime: format(addHours(event.startTime, 2), "HH.mm"),
  endTime: format(addHours(event.endTime, 2), "HH.mm")
});

const getCurrentEvent = () => {
  const idx = closestIndexTo(Date.now(), events.map(e => e.endTime));
  const event = events[idx];
  console.log('Current event:', JSON.stringify(event));
  if (event && isWithinRange(Date.now(), event.startTime, event.endTime)) {
    const { name, startTime, endTime } = mapEvent(event);
    return `${name} (${startTime} - ${endTime})`;
  }
  return null;
};
const getNextEvent = () => {
  const idx = closestIndexTo(Date.now(), events.map(e => e.startTime));
  let event = events[idx];
  if (event && isWithinRange(Date.now(), event.startTime, event.endTime)) {
    event = events[idx + 1];
  }
  console.log('Next event:', JSON.stringify(event));
  if (event) {
    const { name, startTime, endTime } = mapEvent(event);
    return `${name} (${startTime} - ${endTime})`;
  }
  return null;
};
const mapOutput = (currentEvent, nextEvent) => {
  let output = "";
  if (!currentEvent && !nextEvent) {
    return "Event is over. Time to part-ee!";
  }
  if (currentEvent) {
    output += `Nyt: *${currentEvent}*`;
  }
  if (nextEvent) {
    if (output) {
      output += "\n";
    }
    output += `Seuraavaksi: *${nextEvent}*`;
  }
  return output;
};

let validateRequest = function({ token, team_id, user_id } = {}) {
  if (!token || !team_id) {
    return false;
  }
  return (
    token === applicationToken && team_id === applicationTeamId && allowedUsers.includes(user_id)
  );
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
    text: `@channel ${mapOutput(getCurrentEvent(), getNextEvent())}`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Eventholler is now running on port ${PORT}!`);
});

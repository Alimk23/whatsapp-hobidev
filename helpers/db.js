const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://tsxgwnmplsnmgp:87154d10dd546c04b7442e6e02dc40aecb3f7a0216c988496b07c170caa8b265@ec2-3-216-113-109.compute-1.amazonaws.com:5432/d6ujkhnc3c6csb',
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

const readSession = async () => {
  try {
    const res = await client.query('SELECT * FROM wa_sessions ORDER BY created_at DESC LIMIT 1');
    if (res.rows.length) return res.rows[0].session;
    return '';
  } catch (err) {
    throw err;
  }
};

const saveSession = (session) => {
  client.query('INSERT INTO wa_sessions (session) VALUES ($1)', [session], (err, results) => {
    if (err) {
      console.error('Failed to save session!', err);
    } else {
      console.log('Session saved!');
    }
  });
};

const removeSession = () => {
  client.query('DELETE FROM wa_sessions', (err, results) => {
    if (err) {
      console.error('Failed to remove session!', err);
    } else {
      console.log('Session deleted!');
    }
  });
};

module.exports = {
  readSession,
  saveSession,
  removeSession,
};

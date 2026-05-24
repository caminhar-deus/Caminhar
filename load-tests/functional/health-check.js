import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';

export const options = getProfile('health');

export default function () {
  const res = http.get(`${BASE_URL}/api/status?mode=health`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body is ok': (r) => r.json('status') === 'ok',
  });
}
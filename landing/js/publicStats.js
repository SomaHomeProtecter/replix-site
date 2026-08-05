/* /api/v1/public-stats 를 한 번만 부른다 — 히어로 띠(stats.js)와 인기 회차(chart.js)가
   같은 응답을 나눠 쓴다. 모듈은 import 시 한 번만 평가되므로 이 promise 자체가 캐시다. */
import { fetchJson } from './common.js';

export var publicStats = fetchJson('/api/v1/public-stats', { liveViewers: 0, liveRooms: 0, mostWatched: [] });

// Entry point: init order only, no logic.
import { initStore } from './core/store.js';
import { initModal } from './ui/modal.js';
import { initRouter } from './ui/router.js';
import { initTabs } from './ui/tabs.js';
import { startTicker } from './ui/ticker.js';
import { initPlayers } from './features/players/players.js';
import { initQueue } from './features/queue/queue.js';
import { initCourts } from './features/courts/courts.js';
import { initHistory } from './features/history/history.js';
import { initLeaderboard } from './features/rankings/rankings.js';
import { initPayments } from './features/payments/payments.js';

initStore();
initModal();
initRouter();
initTabs();
initPlayers();
initQueue();
initCourts();
initHistory();
initLeaderboard();
initPayments();
startTicker();

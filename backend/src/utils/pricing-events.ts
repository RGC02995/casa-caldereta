import { EventEmitter } from 'events';

export const pricingEvents = new EventEmitter();
pricingEvents.setMaxListeners(200);

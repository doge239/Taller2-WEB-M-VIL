import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Capacitor } from '@capacitor/core';

document.documentElement.classList.toggle('android-app', Capacitor.getPlatform() === 'android');

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

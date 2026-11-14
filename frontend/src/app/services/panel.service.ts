import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PanelAcademico } from '../models/panel.models';

@Injectable({ providedIn: 'root' })
export class PanelService {
  recurso() {
    return httpResource<PanelAcademico>(() => '/api/panel');
  }
}

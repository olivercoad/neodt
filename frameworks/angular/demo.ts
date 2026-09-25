import "@angular/compiler";
import { APP_ID, createComponent, type ComponentRef } from "@angular/core";
import { createApplication } from "@angular/platform-browser";

import type { DemoRenderer } from "../../dev/framework-host";
import Neodt from "./generic";
let applicationId = 0;
export const mount: DemoRenderer = (element, initial) => {
  let props = initial;
  let disposed = false;
  let component: ComponentRef<Neodt<unknown, unknown>> | undefined;
  const application = createApplication({
    providers: [{ provide: APP_ID, useValue: `neodt-demo-${applicationId++}` }],
  });
  void application.then((app) => {
    if (disposed) {
      app.destroy();
      return;
    }
    component = createComponent(Neodt, { environmentInjector: app.injector, hostElement: element });
    app.attachView(component.hostView);
    component.setInput("props", props);
    component.changeDetectorRef.detectChanges();
  });
  return {
    update(next) {
      props = next;
      component?.setInput("props", props);
      component?.changeDetectorRef.detectChanges();
    },
    dispose() {
      disposed = true;
      component?.destroy();
      void application.then((app) => {
        if (!app.destroyed) app.destroy();
      });
    },
  };
};

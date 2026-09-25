import "@angular/compiler";
import { Component, createComponent } from "@angular/core";
import {
  createApplication,
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import { renderApplication, provideServerRendering } from "@angular/platform-server";

import Neodt, { type NeodtProps } from "./generic";
function serverHost<T, TZone>(props: NeodtProps<T, TZone>) {
  class ServerHost {
    props = props;
  }
  Component({
    selector: "neodt-server",
    standalone: true,
    imports: [Neodt],
    template: '<neodt-generic [props]="props" />',
  })(ServerHost);
  return ServerHost;
}
export async function mount<T, TZone>(
  element: HTMLElement,
  props: NeodtProps<T, TZone>,
  hydrating = false,
) {
  if (hydrating) {
    const app = await bootstrapApplication(serverHost(props), {
      providers: [provideClientHydration()],
    });
    const component = app.components[0]!;
    return {
      async update(next: NeodtProps<T, TZone>) {
        component.instance.props = next;
        component.changeDetectorRef.detectChanges();
        await app.whenStable();
      },
      dispose() {
        app.destroy();
      },
    };
  }
  const app = await createApplication();
  const component = createComponent(Neodt<T, TZone>, {
    environmentInjector: app.injector,
    hostElement: element,
  });
  app.attachView(component.hostView);
  component.setInput("props", props);
  component.changeDetectorRef.detectChanges();
  return {
    async update(next: NeodtProps<T, TZone>) {
      component.setInput("props", next);
      component.changeDetectorRef.detectChanges();
      await app.whenStable();
    },
    dispose() {
      component.destroy();
      app.destroy();
    },
  };
}
export async function renderServer<T, TZone>(props: NeodtProps<T, TZone>) {
  const html = await renderApplication(
    (context) =>
      bootstrapApplication(
        serverHost(props),
        { providers: [provideClientHydration(), provideServerRendering()] },
        context,
      ),
    { document: "<neodt-server></neodt-server>" },
  );
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? html;
  return body;
}

// The fixture embeds the server body in its own document; preserve Angular's
// server integrity marker immediately before that document's body.
export const hydrationMarker = () => "<!--nghm-->";

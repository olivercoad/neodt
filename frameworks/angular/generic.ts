import "@angular/compiler";
import {
  APP_ID,
  Component,
  ChangeDetectorRef,
  ApplicationRef,
  inject,
  type Type,
} from "@angular/core";

import Control from "../../generated/angular/Control";
import type { DateAdapter } from "../../src/adapter";
import { controllerProps, rootAttributes, invokeHandler } from "../../src/core/binding";
import { createController } from "../../src/core/controller";
import type { CoreProps } from "../../src/core/props";

import "../../src/styles.css";
export type NeodtProps<T, TZone = string> = CoreProps<T, TZone> & {
  class?: string;
  id?: string;
  title?: string;
  onClick?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  [attribute: `aria-${string}`]: string | boolean | undefined;
  [attribute: `data-${string}`]: unknown;
};
const counts = new WeakMap<ApplicationRef, number>();
export class Neodt<T, TZone = string> {
  props!: NeodtProps<T, TZone>;
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly application = inject(ApplicationRef);
  private readonly id = `${inject(APP_ID)}-neodt-${counts.get(this.application) ?? 0}`;
  controller!: ReturnType<typeof createController<T, TZone>>;
  view!: ReturnType<typeof this.controller.getSnapshot>;
  attributes: Record<string, unknown> = {};
  private unsubscribe?: () => void;
  constructor() {
    counts.set(this.application, (counts.get(this.application) ?? 0) + 1);
  }
  private updatingProps = false;
  ngOnChanges() {
    this.updatingProps = true;
    const props = controllerProps({ ...this.props }, this.id);
    if (!this.controller) {
      this.controller = createController(props);
      this.unsubscribe = this.controller.subscribe(() => {
        this.view = this.controller.getSnapshot();
        if (this.updatingProps) this.changeDetector.markForCheck();
        else this.changeDetector.detectChanges();
      });
    } else this.controller.update(props);
    this.view = this.controller.getSnapshot();
    this.attributes = rootAttributes({ ...this.props });
    this.updatingProps = false;
  }
  click(event: MouseEvent) {
    invokeHandler(this.props.onClick, event);
    this.controller.click(event);
  }
  mouseDown(event: MouseEvent) {
    invokeHandler(this.props.onMouseDown, event);
    this.controller.mouseDown(event);
  }
  ngOnDestroy() {
    this.unsubscribe?.();
    this.controller?.unmount();
  }
}
Component({
  selector: "neodt-generic",
  standalone: true,
  inputs: ["props"],
  imports: [Control],
  host: { style: "display: contents" },
  template: `<control [view]="view" [controller]="controller" [attributes]="attributes" (onRootClick)="click($event)" (onRootMouseDown)="mouseDown($event)" />`,
})(Neodt);
export default Neodt;
export function configureNeodt<T, TZone>(
  adapter: DateAdapter<T, TZone>,
): Type<{ props: Omit<NeodtProps<T, TZone>, "adapter"> }> {
  class ConfiguredNeodt {
    props!: Omit<NeodtProps<T, TZone>, "adapter">;
    get boundProps() {
      return { ...this.props, adapter };
    }
  }
  Component({
    selector: "neodt-input",
    standalone: true,
    inputs: ["props"],
    imports: [Neodt],
    host: { style: "display: contents" },
    template: `<neodt-generic [props]="boundProps" />`,
  })(ConfiguredNeodt);
  return ConfiguredNeodt;
}
export * from "../../src/public";
export { parseNaturalDate, type NaturalDateParseOptions } from "../../src/natural-parser";

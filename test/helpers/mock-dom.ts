export class MockDOMElement {
  public id: string;
  public tagName: string;
  private _html: string = '';
  public eventListeners: Record<string, ((e?: any) => void)[]> = {};
  public attributes: Record<string, string> = {};
  public value: string = '';
  public children: MockDOMElement[] = [];
  public _fields: Record<string, string> = {};

  get innerHTML(): string {
    return this._html;
  }

  set innerHTML(val: string) {
    this._html = val;
    this.children = [];
    const idRegex = /<([a-zA-Z0-9]+)[^>]*id="([^"]+)"[^>]*>/g;
    let match;
    while ((match = idRegex.exec(val)) !== null) {
      const child = new MockDOMElement(match[2], match[1].toUpperCase());
      this.children.push(child);
    }
  }

  constructor(id: string = '', tagName: string = 'DIV') {
    this.id = id;
    this.tagName = tagName;
  }

  addEventListener(event: string, callback: (e?: any) => void) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  dispatchEvent(event: string, eventData: any = {}) {
    const handlers = this.eventListeners[event] || [];
    for (const h of handlers) {
      h(eventData);
    }
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  click() {
    this.dispatchEvent('click');
  }

  appendChild(child: any) {
    this.children.push(child);
  }

  removeChild(child: any) {
    this.children = this.children.filter((c) => c !== child);
  }

  querySelector(selector: string): any {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector: string): any[] {
    const found: MockDOMElement[] = [];

    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      if (this.id === targetId) return [this];
      const match = this.children.find((c) => c.id === targetId);
      if (match) return [match];
    } else if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      const regex = new RegExp(`class="[^"]*${cls}[^"]*"[^>]*data-id="([^"]+)"`, 'g');
      let match;
      while ((match = regex.exec(this._html)) !== null) {
        const el = new MockDOMElement('', 'BUTTON');
        el.setAttribute('data-id', match[1]);
        found.push(el);
      }
    }
    return found;
  }
}

export class MockDOMDocument {
  private elements = new Map<string, MockDOMElement>();
  public body = new MockDOMElement('body', 'BODY');

  constructor() {
    this.register('kpi-section');
    this.register('species-chart-section');
    this.register('toolbar-section');
    this.register('table-section');
    this.register('modal-container');
    this.register('btn-new-entry', 'BUTTON');
  }

  register(id: string, tagName: string = 'DIV'): MockDOMElement {
    const el = new MockDOMElement(id, tagName);
    this.elements.set(id, el);
    return el;
  }

  getElementById(id: string): MockDOMElement | null {
    return this.elements.get(id) || null;
  }

  createElement(tag: string): MockDOMElement {
    return new MockDOMElement('', tag.toUpperCase());
  }

  addEventListener(_event: string, _callback: any) {}
}

export class MockFormData {
  private map = new Map<string, string>();
  constructor(form?: any) {
    if (form && form._fields) {
      for (const [k, v] of Object.entries(form._fields)) {
        this.map.set(k, String(v));
      }
    }
  }
  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.map.set(key, value);
  }
}

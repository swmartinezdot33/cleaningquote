declare namespace JSX {
  interface IntrinsicElements {
    'stripe-buy-button': {
      'buy-button-id': string;
      'publishable-key': string;
      'customer-email'?: string;
      'client-reference-id'?: string;
    };
  }
}

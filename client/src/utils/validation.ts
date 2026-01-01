export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ContractFormData {
  contract_no: string;
  direction: 'export' | 'import';
  seller_id: string;
  buyer_id: string;
  issue_date: Date | null;
  contract_currency: string;
  items: ContractItem[];
}

export interface ContractItem {
  id: string;
  article_id: string;
  qty_ton: string;
  price: string;
}

export const validateContract = (data: ContractFormData): ValidationResult => {
  const errors: string[] = [];

  if (!data.contract_no?.trim()) {
    errors.push("Contract number is required");
  }

  if (!data.seller_id) {
    errors.push("Seller is required");
  }

  if (!data.buyer_id) {
    errors.push("Buyer is required");
  }

  if (!data.issue_date) {
    errors.push("Issue date is required");
  }

  if (!data.contract_currency?.trim()) {
    errors.push("Contract currency is required");
  }

  if (!data.items || data.items.length === 0) {
    errors.push("At least one item is required");
  } else {
    data.items.forEach((item, index) => {
      if (!item.article_id) {
        errors.push(`Item ${index + 1}: Article is required`);
      }
      
      const qty = Number(item.qty_ton);
      if (!qty || qty <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }

      const price = Number(item.price);
      if (!price || price <= 0) {
        errors.push(`Item ${index + 1}: Price must be greater than 0`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
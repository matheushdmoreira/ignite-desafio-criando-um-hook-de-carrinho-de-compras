import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productAlreadyExistsInCart = cart.find(
        product => product.id === productId
      );

      if (productAlreadyExistsInCart) {
        const { amount: productAmount } = productAlreadyExistsInCart;

        if (stock.amount <= productAmount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const updateProductsAmount = cart.map(product => {
          return product.id === productId 
          ? {...product, amount: productAmount + 1}
          : product
        });

        setCart(updateProductsAmount);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProductsAmount));

        return;
      }

      const { data: productData } = await api.get<Product>(
        `/products/${productId}`
      );

      if (!productData) {
        toast.error("Erro na adição do produto");
        return;
      }

      const newProductAmount = {...productData, amount: 1};

      const newCart = [...cart, newProductAmount ];

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAlreadyExists = cart.find(
        product => product.id === productId
      );

      if(!productAlreadyExists) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const newProducts = cart.filter(product => {
        return product.id !== productId;
      });

      setCart(newProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const { data: stock } = await api.get(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productAlreadyExistsInCart = cart.find(
        product => product.id === productId
      );

      if (!productAlreadyExistsInCart) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const updateProductsAmount = cart.map(product => {
        return product.id === productId 
        ? {...product, amount}
        : product
      });

      setCart(updateProductsAmount);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProductsAmount));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

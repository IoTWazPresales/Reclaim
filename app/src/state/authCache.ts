let _email: string | null = null;

export const setLastEmail = (e: string | null) => {
  _email = e;
};

export const getLastEmail = () => _email;
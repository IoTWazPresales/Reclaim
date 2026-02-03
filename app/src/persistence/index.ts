export { type StorageAdapter } from './StorageAdapter';
export { AsyncStorageAdapter } from './AsyncStorageAdapter';
export { getItemScoped, setItemScoped, removeItemScoped } from './ScopedStorage';
export { storageAdapter } from './storageInstance';

import { storageAdapter } from './storageInstance';
export default storageAdapter;

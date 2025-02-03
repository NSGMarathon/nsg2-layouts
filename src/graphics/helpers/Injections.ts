import { InjectionKey, Ref } from 'vue';

export const PlayerNameplateModeInjectionKey = Symbol() as InjectionKey<Ref<'name' | 'social'>>;
export const GameLayoutFeedIndexInjectionKey = Symbol() as InjectionKey<number>;

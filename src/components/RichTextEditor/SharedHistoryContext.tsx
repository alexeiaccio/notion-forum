import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import {createEmptyHistoryState} from '@lexical/react/LexicalHistoryPlugin';
import * as React from 'react';
import {createContext, useContext, useMemo} from 'react';

type ContextShape = {
  historyState?: HistoryState;
};

const Context = createContext<ContextShape>({
  historyState: {current: null, redoStack: [], undoStack: []}
});

export const SharedHistoryContext = ({
  children
}: {
  children: JSX.Element | string | (JSX.Element | string)[];
}): JSX.Element => {
  const historyContext = useMemo(() => ({historyState: createEmptyHistoryState()}), []);
  return <Context.Provider value={historyContext}>{children}</Context.Provider>;
};

export const useSharedHistoryContext = (): ContextShape => {
  return useContext(Context);
};

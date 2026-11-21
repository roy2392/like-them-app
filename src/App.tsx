import { useCallback, useEffect, useState } from 'react';
import { backend, type Session } from './backend';
import { AuthScreen } from './screens/AuthScreen';
import { BarScene } from './screens/BarScene';
import { CharacterCreator } from './screens/CharacterCreator';
import { DateScene } from './screens/DateScene';
import { Hub } from './screens/Hub';
import type { Character, CharacterInput, DateInvite } from './types';

type View =
  | { name: 'hub' }
  | { name: 'bar' }
  | { name: 'wardrobe' }
  | { name: 'date'; invite: DateInvite; other: Character };

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [character, setCharacter] = useState<Character | null | undefined>(undefined);
  const [view, setView] = useState<View>({ name: 'hub' });

  useEffect(() => {
    void backend.getSession().then(setSession);
    return backend.onAuthChange(setSession);
  }, []);

  useEffect(() => {
    if (!session) {
      setCharacter(session === null ? null : undefined);
      setView({ name: 'hub' });
      return;
    }
    setCharacter(undefined);
    void backend.getMyCharacter().then(setCharacter);
  }, [session]);

  const onCharacter = useCallback((c: Character) => setCharacter(c), []);
  const goHub = useCallback(() => setView({ name: 'hub' }), []);

  if (session === undefined || (session && character === undefined)) {
    return (
      <div className="screen center">
        <div className="neon-title">Like Them</div>
      </div>
    );
  }
  if (!session) return <AuthScreen />;

  if (!character) {
    return (
      <CharacterCreator
        onSave={async (input: CharacterInput) => {
          setCharacter(await backend.createCharacter(input));
          setView({ name: 'bar' });
        }}
      />
    );
  }

  switch (view.name) {
    case 'bar':
      return <BarScene character={character} onCharacter={onCharacter} onExit={goHub} />;
    case 'wardrobe':
      return (
        <CharacterCreator
          existing={character}
          onCancel={goHub}
          onSave={async (input) => {
            setCharacter(await backend.updateCharacter({ name: input.name, lookingFor: input.lookingFor, bio: input.bio, appearance: input.appearance }));
            goHub();
          }}
        />
      );
    case 'date':
      return <DateScene invite={view.invite} me={character} other={view.other} onBack={goHub} />;
    default:
      return (
        <Hub
          character={character}
          onCharacter={onCharacter}
          onEnterBar={() => setView({ name: 'bar' })}
          onWardrobe={() => setView({ name: 'wardrobe' })}
          onOpenDate={(invite, other) => setView({ name: 'date', invite, other })}
        />
      );
  }
}

// @ts-nocheck
import { useBroadcastEvent, useEventListener, useMyPresence } from "@liveblocks/react"
import LiveCursors from "./cursor/LiveCursors"
import { useCallback, useEffect, useState } from "react";
import CursorChat from "./cursor/CursorChat";
import { CursorMode, CursorState, Reaction} from "@/types/type";
import ReactionSelector from "./reaction/ReactionButton";
import FlyingReaction from "./reaction/FlyingReaction";
import useInterval from "@/hooks/useInterval";

import { Timestamp } from "@liveblocks/react-comments/primitives";
import { Comments } from "./comments/Comments";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { shortcuts } from "@/constants";


type Props = {
  canvasRef :React.MutableRefObject<HTMLCanvasElement | null>
  undo: () => void;
  redo: () => void;
  activePage: string;
}

const Live = ({canvasRef, undo, redo, activePage}: Props) => {
     const [{cursor}, updateMyPresence] = useMyPresence();

    const [cursorState, setCursorState] = useState<CursorState>({
      mode: CursorMode.Hidden 
    })

    const[reactions, setReactions] = useState<Reaction[]>
    ([])
    
    const broadcast = useBroadcastEvent();

    useInterval(() => {
      setReactions((reaction) => reaction.filter((r) => r.
      timestamp > Date.now() - 4000  ))
    }, 1000)

    useInterval(() => {
      if(cursorState.mode === CursorMode.Reaction && 
        cursorState.isPressed && cursor){
          setReactions((reaction) => reaction.concat([
            {
            point: {x: cursor.x , y: cursor.y},
            value: cursorState.reaction,
            timestamp: Date.now(),
          }
        ]))

        broadcast({
          x: cursor.x,
          y: cursor.y,
          value: cursorState.reaction
        })
        }
    }, 100)

    useEventListener((eventData) => {
      const event = eventData.event 

      setReactions((reaction) => reaction.concat([
            {
            point: {x: event.x , y: event.y},
            value: event.value,
            timestamp: Date.now(),
          }
        ]))
    })
    
    const handlePointerMove = useCallback((event: React.PointerEvent) => {
      event.preventDefault();

      if(cursor === null || cursorState.mode !== CursorMode.
        ReactionSelector) {

          const x = event.clientX - event.currentTarget.
          getBoundingClientRect().x;
          const y = event.clientY - event.currentTarget.
          getBoundingClientRect().y;
          
          updateMyPresence({cursor: {x, y} })
        }

    }, []) 


    const handlePointerLeave = useCallback((event: React.PointerEvent) => {
      setCursorState({
        mode: CursorMode.Hidden
      })
      
      updateMyPresence({cursor: null, message: null })

    }, []) 


    const handlePointerUp = useCallback((event: React.PointerEvent) => {
      setCursorState(
        (state: cursorState) =>
        cursorState.mode === CursorMode.Reaction ? 
      {...state, isPressed: true} : state
      )
    }, [cursorState.mode, setCursorState]) 


    const handlePointerDown = useCallback((event: React.PointerEvent) => {

      const x = event.clientX - event.currentTarget.
      getBoundingClientRect().x;
      const y = event.clientY - event.currentTarget.
      getBoundingClientRect().y;

      updateMyPresence({cursor: {x, y} })

      setCursorState(
        (state: cursorState) =>
        cursorState.mode === CursorMode.Reaction ? 
      {...state, isPressed: true} : state
      )
    }, [cursorState.mode, setCursorState]
     
  ) 

    useEffect(() => {
      const onKeyUp = (e: KeyboardEvent) => {
        if(e.key === '/') {
          setCursorState({
             mode:CursorMode.Chat,
             previousMessage: null,
             message: '',
          }) 
        }  else if(e.key === 'Escape') {
           updateMyPresence({message : ''})
           setCursorState({mode: CursorMode.Hidden})
        } else if(e.key === 'e') {
          setCursorState({
            mode: CursorMode.ReactionSelector
          })
          
        }
      }

      const onKeyDown = (e: KeyboardEvent) => {
        if(e.key === '/') {
        e.preventDefault();
        }
      }

    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('keydown', onKeyDown)

    return () => { 
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [updateMyPresence]);

  const setReactionsFunc = useCallback((reaction:string) => 
  {
    setCursorState({
      mode:CursorMode.Reaction , 
      reaction, isPressed: false
    })
    
  }, [])
  
  const handleContextMenuClick = useCallback((key:string) => {
    switch (key) {
      case 'Chat':
        setCursorState({
          mode:CursorMode.Chat,
          previousMessage: null,
          message: '',    
        })
        break; 

       case 'Undo':
        undo();
        break;

        case 'Redo':
          redo();
          break;

          default :
          break;
          
        case 'Reactions':
           setCursorState({
            mode: CursorMode.ReactionSelector
          })  
    }
  }, [])

  return (
    <ContextMenu>
      <ContextMenuTrigger
    id="canvas"
    onPointerMove={handlePointerMove}
    onPointerLeave={handlePointerLeave}
    onPointerUp={handlePointerUp}
    onPointerDown={handlePointerDown}
    className="relative flex  h-full w-full flex-1 
    justify-center 
    items-center "
    >

      <canvas ref={canvasRef} />
     
     {reactions.map((r) => (
      <FlyingReaction
      key={r.timestamp.toString()}
      x={r.point.x}
      y={r.point.y}
      timestamp ={r.timestamp}
      value={r.value}   />
     ))}


      {cursor && (
        <CursorChat 
        cursor = {cursor}
        cursorState = {cursorState}
        setCursorState = {setCursorState}
        updateMyPresence = {updateMyPresence}
        />
      )}

    {cursorState.mode === CursorMode.
    ReactionSelector && (
      <ReactionSelector 
      setReaction={setReactionsFunc}
      />
    )}


      <LiveCursors />

      <Comments activePage={activePage} /> 
    
    </ContextMenuTrigger>

    <ContextMenuContent className='right-menu-content'>
      {shortcuts.map((item) => (
         <ContextMenuItem key={item.key} onClick={() => handleContextMenuClick(item.name)}>
           <p>{item.name}</p>
           <p className="text-sx  text-primary-grey-300 ml-2">
            {item.shortcut}
           </p>
         </ContextMenuItem>
       
    ))}
    </ContextMenuContent >
    
    </ContextMenu>
  )
}


export default Live


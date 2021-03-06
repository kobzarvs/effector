//@flow

import fetch from 'cross-fetch'
import * as React from 'react'
import {render, container, act} from 'effector/fixtures/react'
import {argumentHistory} from 'effector/fixtures'
import {createDomain, forward, sample, attach} from 'effector'

import {fork, allSettled, serialize} from 'effector/fork'
import {Provider, useStore, useList} from 'effector-react/ssr'

it('works', async () => {
  const indirectCallFn = jest.fn()

  const app = createDomain()
  const start = app.event()
  const indirectCall = app.event()
  const sendStats = app.effect({
    async handler(user) {
      await new Promise(resolve => {
        // let bob loading longer
        setTimeout(resolve, user === 'bob' ? 500 : 100)
      })
    },
  })

  const fetchUser = app.effect({
    async handler(user) {
      return (
        await fetch('https://ssr.effector.dev/api/' + user, {
          method: 'POST',
        })
      ).json()
    },
  })
  //assume that calling start() will trigger some effects
  forward({
    from: start,
    to: fetchUser,
  })

  const user = app.store('guest')
  const friends = app.store([])
  const friendsTotal = friends.map(list => list.length)

  user.on(fetchUser.doneData, (_, result) => result.name)
  friends.on(fetchUser.doneData, (_, result) => result.friends)

  sample({
    source: user,
    clock: fetchUser.done,
    target: sendStats,
  })
  sample({
    source: user,
    clock: indirectCall,
  }).watch(indirectCallFn)

  sendStats.done.watch(() => {
    indirectCall()
  })

  const aliceScope = fork(app)
  const bobScope = fork(app)
  const carolScope = fork(app)
  await Promise.all([
    allSettled(start, {
      scope: aliceScope,
      params: 'alice',
    }),
    allSettled(start, {
      scope: bobScope,
      params: 'bob',
    }),
    allSettled(start, {
      scope: carolScope,
      params: 'carol',
    }),
  ])
  const User = () => <h2>{useStore(user)}</h2>
  const Friends = () => useList(friends, friend => <li>{friend}</li>)
  const Total = () => <small>Total: {useStore(friendsTotal)}</small>

  const App = ({root}) => (
    <Provider value={root}>
      <User />
      <b>Friends:</b>
      <ol>
        <Friends />
      </ol>
      <Total />
    </Provider>
  )

  await render(<App root={bobScope} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
    <h2>
      bob
    </h2>
  `)

  expect(serialize(aliceScope)).toMatchInlineSnapshot(`
    Object {
      "-r5k0rx": "alice",
      "i2cgp1": Array [
        "bob",
        "carol",
      ],
    }
  `)
  expect(serialize(bobScope)).toMatchInlineSnapshot(`
    Object {
      "-r5k0rx": "bob",
      "i2cgp1": Array [
        "alice",
      ],
    }
  `)
  expect(indirectCallFn).toBeCalled()
})

test('attach support', async () => {
  const indirectCallFn = jest.fn()

  const app = createDomain()
  const start = app.createEvent()
  const indirectCall = app.createEvent()
  const sendStats = app.createEffect({
    async handler(user) {
      await new Promise(resolve => {
        // let bob loading longer
        setTimeout(resolve, user === 'bob' ? 500 : 100)
      })
    },
  })

  const baseUrl = app.createStore('https://ssr.effector.dev/api')

  const fetchJson = app.createEffect({
    async handler(url) {
      return (
        await fetch(url, {
          method: 'POST',
        })
      ).json()
    },
  })

  const fetchUser = attach({
    source: {baseUrl},
    effect: fetchJson,
    mapParams: (user, {baseUrl}) => `${baseUrl}/${user}`,
  })

  //assume that calling start() will trigger some effects
  forward({
    from: start,
    to: fetchUser,
  })

  const user = app.createStore('guest')
  const friends = app.createStore([])
  const friendsTotal = friends.map(list => list.length)

  user.on(fetchUser.doneData, (_, result) => result.name)
  friends.on(fetchUser.doneData, (_, result) => result.friends)

  sample({
    source: user,
    clock: fetchUser.done,
    target: sendStats,
  })
  sample({
    source: user,
    clock: indirectCall,
  }).watch(indirectCallFn)

  sendStats.done.watch(() => {
    indirectCall()
  })

  const aliceScope = fork(app)
  const bobScope = fork(app)
  const carolScope = fork(app)
  await Promise.all([
    allSettled(start, {
      scope: aliceScope,
      params: 'alice',
    }),
    allSettled(start, {
      scope: bobScope,
      params: 'bob',
    }),
    allSettled(start, {
      scope: carolScope,
      params: 'carol',
    }),
  ])
  const User = () => <h2>{useStore(user)}</h2>
  const Friends = () => useList(friends, friend => <li>{friend}</li>)
  const Total = () => <small>Total: {useStore(friendsTotal)}</small>

  const App = ({root}) => (
    <Provider value={root}>
      <User />
      <b>Friends:</b>
      <ol>
        <Friends />
      </ol>
      <Total />
    </Provider>
  )

  await render(<App root={bobScope} />)
  expect(container.firstChild).toMatchInlineSnapshot(`
<h2>
  bob
</h2>
`)
  expect(serialize(aliceScope)).toMatchInlineSnapshot(`
Object {
  "-emnm5v": "alice",
  "8r4q44": "https://ssr.effector.dev/api",
  "ndtnwz": Array [
    "bob",
    "carol",
  ],
}
`)
  expect(serialize(bobScope)).toMatchInlineSnapshot(`
Object {
  "-emnm5v": "bob",
  "8r4q44": "https://ssr.effector.dev/api",
  "ndtnwz": Array [
    "alice",
  ],
}
`)
  expect(indirectCallFn).toBeCalled()
})

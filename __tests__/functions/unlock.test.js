import * as core from '@actions/core'
import {unlock} from '../../src/functions/unlock'
import * as actionStatus from '../../src/functions/action-status'

class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.status = 422
  }
}

beforeEach(() => {
  jest.spyOn(actionStatus, 'actionStatus').mockImplementation(() => {
    return undefined
  })
  jest.spyOn(core, 'info').mockImplementation(() => {})
})

const context = {
  repo: {
    owner: 'corp',
    repo: 'test'
  },
  issue: {
    number: 1
  }
}

const octokit = {
  rest: {
    git: {
      deleteRef: jest.fn().mockReturnValue({status: 204})
    }
  }
}

test('successfully releases a deployment lock with the unlock function', async () => {
  expect(await unlock(octokit, context, 123)).toBe(true)
  expect(octokit.rest.git.deleteRef).toHaveBeenCalledWith({
    owner: 'corp',
    repo: 'test',
    ref: 'heads/branch-deploy-lock'
  })
})

test('fails to release a deployment lock due to a bad HTTP code from the GitHub API', async () => {
  const badHttpOctokitMock = {
    rest: {
      git: {
        deleteRef: jest.fn().mockReturnValue({status: 500})
      }
    }
  }
  expect(await unlock(badHttpOctokitMock, context, 123)).toBe(false)
  expect(octokit.rest.git.deleteRef).toHaveBeenCalledWith({
    owner: 'corp',
    repo: 'test',
    ref: 'heads/branch-deploy-lock'
  })
})

test('Does not find a deployment lock branch so it lets the user know', async () => {
  const actionStatusSpy = jest
    .spyOn(actionStatus, 'actionStatus')
    .mockImplementation(() => {
      return undefined
    })
  const noBranchOctokitMock = {
    rest: {
      git: {
        deleteRef: jest
          .fn()
          .mockRejectedValue(new NotFoundError('Reference does not exist'))
      }
    }
  }
  expect(await unlock(noBranchOctokitMock, context, 123)).toBe(true)
  expect(actionStatusSpy).toHaveBeenCalledWith(
    context,
    noBranchOctokitMock,
    123,
    '🔓 There is currently no deployment lock set',
    true,
    true
  )
})

test('throws an error if an unhandled exception occurs', async () => {
  const errorOctokitMock = {
    rest: {
      git: {
        deleteRef: jest.fn().mockRejectedValue(new Error('oh no'))
      }
    }
  }
  try {
    await unlock(errorOctokitMock, context, 123)
  } catch (e) {
    expect(e.message).toBe('Error: oh no')
  }
})
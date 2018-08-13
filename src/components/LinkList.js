import React, { Component, Fragment } from 'react'
import Link from './Link'
import { Query } from 'react-apollo'
import gql from 'graphql-tag'
import { LINKS_PER_PAGE } from '../constants'


const NEW_VOTES_SUBSCRIPTION = gql`
  subscription {
    newVote {
      node {
        id
        link {
          id
          url
          description
          createdAt
          postedBy {
            id
            name
          }
          votes {
            id
            user {
              id
            }
          }
        }
        user {
          id
        }
      }
    }
  }
`

const NEW_LINKS_SUBSCRIPTION = gql`
  subscription {
    newLink {
      node {
        id
        url
        description
        createdAt
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
    }
  }
`

// First, you create the JavaScript constant called FEED_QUERY that stores the query. The gql function is used to parse the plain string that contains the GraphQL code (if you’re unfamililar with the backtick-syntax, you can read up on JavaScript’s tagged template literals).

// The query now accepts arguments that we’ll use to implement pagination and ordering. skip defines the offset where the query will start. If you passed a value of e.g. 10 for this argument, it means that the first 10 items of the list will not be included in the response. first then defines the limit, or how many elements, you want to load from that list. Say, you’re passing the 10 for skip and 5 for first, you’ll receive items 10 to 15 from the list. orderBy defines how the returned list should be sorted.

export const FEED_QUERY = gql`
  query FeedQuery($first: Int, $skip: Int, $orderBy: LinkOrderByInput) {
    feed(first: $first, skip: $skip, orderBy: $orderBy) {
      links {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      count
    }
  }
`


// Let’s walk through what’s happening in this code. As expected, Apollo injected several props into the component’s render prop function. These props themselves provide information about the state of the network request:
class LinkList extends Component {

    _nextPage = data => {
        const page = parseInt(this.props.match.params.page, 10)
        if (page <= data.feed.count / LINKS_PER_PAGE) {
          const nextPage = page + 1
          this.props.history.push(`/new/${nextPage}`)
        }
      }
      
      _previousPage = () => {
        const page = parseInt(this.props.match.params.page, 10)
        if (page > 1) {
          const previousPage = page - 1
          this.props.history.push(`/new/${previousPage}`)
        }
      }

    _getLinksToRender = data => {
        const isNewPage = this.props.location.pathname.includes('new')
        if (isNewPage) {
          return data.feed.links
        }
        const rankedLinks = data.feed.links.slice()
        rankedLinks.sort((l1, l2) => l2.votes.length - l1.votes.length)
        return rankedLinks
      }

    _getQueryVariables = () => {
        const isNewPage = this.props.location.pathname.includes('new')
        const page = parseInt(this.props.match.params.page, 10)
      
        const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
        const first = isNewPage ? LINKS_PER_PAGE : 100
        const orderBy = isNewPage ? 'createdAt_DESC' : null
        return { first, skip, orderBy }
      }

    _subscribeToNewVotes = subscribeToMore => {
        subscribeToMore({
          document: NEW_VOTES_SUBSCRIPTION
        })
      }

      _updateCacheAfterVote = (store, createVote, linkId) => {
        const isNewPage = this.props.location.pathname.includes('new')
        const page = parseInt(this.props.match.params.page, 10)
      
        const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
        const first = isNewPage ? LINKS_PER_PAGE : 100
        const orderBy = isNewPage ? 'createdAt_DESC' : null
        const data = store.readQuery({
          query: FEED_QUERY,
          variables: { first, skip, orderBy }
        })
      
        const votedLink = data.feed.links.find(link => link.id === linkId)
        votedLink.votes = createVote.link.votes
        store.writeQuery({ query: FEED_QUERY, data })
      }

      _subscribeToNewLinks = subscribeToMore => {
        subscribeToMore({
          document: NEW_LINKS_SUBSCRIPTION,
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev
            const newLink = subscriptionData.data.newLink.node
      
            // document: This represents the subscription query itself. In your case, the subscription will fire every time a new link is created.

            // updateQuery: Similar to cache update prop, this function allows you to determine how the store should be updated with the information that was sent by the server after the event occurred. In fact, it follows exactly the same principle as a Redux reducer: It takes as arguments the previous state (of the query that subscribeToMore was called on) and the subscription data that’s sent by the server. You can then determine how to merge the subscription data into the existing state and return the updated data. All you’re doing inside updateQuery is retrieve the new link from the received subscriptionData, merge it into the existing list of links and return the result of this operation.

                  return Object.assign({}, prev, {
                      feed: {
                          links: [newLink, ...prev.feed.links],
                          count: prev.feed.links.length + 1,
                          __typename: prev.feed.__typename
                      }
                  })
              }
          })
      }

      render() {
        return (
          <Query query={FEED_QUERY} variables={this._getQueryVariables()}>
            {({ loading, error, data, subscribeToMore }) => {
              if (loading) return <div>Fetching</div>
              if (error) return <div>Error</div>
      
              this._subscribeToNewLinks(subscribeToMore)
              this._subscribeToNewVotes(subscribeToMore)
      
              const linksToRender = this._getLinksToRender(data)
              const isNewPage = this.props.location.pathname.includes('new')
              const pageIndex = this.props.match.params.page
                ? (this.props.match.params.page - 1) * LINKS_PER_PAGE
                : 0
      
              return (
                <Fragment>
                  {linksToRender.map((link, index) => (
                    <Link
                      key={link.id}
                      link={link}
                      index={index + pageIndex}
                      updateStoreAfterVote={this._updateCacheAfterVote}
                    />
                  ))}
                  {isNewPage && (
                    <div className="flex ml4 mv3 gray">
                      <div className="pointer mr2" onClick={this._previousPage}>
                        Previous
                      </div>
                      <div className="pointer" onClick={() => this._nextPage(data)}>
                        Next
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            }}
          </Query>
        )
      }
}

export default LinkList
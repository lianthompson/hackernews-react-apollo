import React, { Component } from 'react'
import Link from './Link'
import { Query } from 'react-apollo'
import gql from 'graphql-tag'

// First, you create the JavaScript constant called FEED_QUERY that stores the query. The gql function is used to parse the plain string that contains the GraphQL code (if you’re unfamililar with the backtick-syntax, you can read up on JavaScript’s tagged template literals).

const FEED_QUERY = gql`
  {
    feed {
      links {
        id
        createdAt
        url
        description
      }
    }
  }
`

// Let’s walk through what’s happening in this code. As expected, Apollo injected several props into the component’s render prop function. These props themselves provide information about the state of the network request:
class LinkList extends Component {
    render() {
        return (
            <Query query={FEED_QUERY}>
                {({ loading, error, data }) => {
                    // loading: Is true as long as the request is still ongoing and the response hasn’t been received.
                    if (loading) return <div>Fetching</div>
                    // error: In case the request fails, this field will contain information about what exactly went wrong.
                    if (error) return <div>Error</div>

                    // data: This is the actual data that was received from the server. It has the links property which represents a list of Link elements.
                    const linksToRender = data.feed.links

                    return (
                        <div>
                            {linksToRender.map(link => <Link key={link.id} link={link} />)}
                        </div>
                    )
                }}
            </Query>
        )
    }
}

export default LinkList
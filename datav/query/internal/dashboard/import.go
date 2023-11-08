package dashboard

import (
	"encoding/json"
	"time"

	"github.com/xObserve/xObserve/query/pkg/db"
	"github.com/xObserve/xObserve/query/pkg/models"
	"github.com/xObserve/xObserve/query/pkg/utils"
)

func ImportFromJSON(raw string, userId int64) (*models.Dashboard, error) {
	var dash *models.Dashboard
	err := json.Unmarshal([]byte(raw), &dash)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if dash.Id == "" {
		dash.Id = "d-" + utils.GenerateShortUID()
	}

	dash.CreatedBy = userId
	dash.Created = &now
	dash.Updated = &now

	jsonData, err := dash.Data.Encode()
	if err != nil {
		return nil, err
	}

	tags, err := json.Marshal(dash.Tags)
	if err != nil {
		return nil, err
	}

	_, err = db.Conn.Exec(`INSERT INTO dashboard (id,title, team_id, created_by,tags, data,created,updated) VALUES (?,?,?,?,?,?,?,?)`,
		dash.Id, dash.Title, dash.OwnedBy, dash.CreatedBy, tags, jsonData, dash.Created, dash.Updated)
	if err != nil {
		return nil, err
	}

	return dash, nil
}
